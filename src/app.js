const crypto = require('crypto');
const express = require('express');
const path = require('path');
const { getConfig } = require('./bot/config');
const { BookingBot } = require('./bot/bookingBot');
const { createWhatsAppClient } = require('./whatsapp/client');
const { createBookingStore } = require('./bookingStore');

function verifyMetaSignature(rawBody, signature, appSecret) {
  if (!appSecret) return true;
  if (!signature || !rawBody) return false;

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

function extractInboundMessages(payload) {
  if (payload?.object !== 'whatsapp_business_account') return [];

  return (payload.entry || []).flatMap((entry) =>
    (entry.changes || []).flatMap((change) => {
      if (change.field !== 'messages') return [];
      return (change.value?.messages || []).map((message) => ({
        message,
        metadata: change.value.metadata || {},
        contact: change.value.contacts?.find((contact) => contact.wa_id === message.from) || {},
      }));
    }),
  );
}

function messageText(message) {
  if (message.type === 'text') return message.text?.body || '';
  if (message.type === 'interactive') {
    return (
      message.interactive?.button_reply?.id ||
      message.interactive?.list_reply?.id ||
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      ''
    );
  }
  if (message.type === 'button') return message.button?.payload || message.button?.text || '';
  return '';
}

function createProcessedMessageCache(ttlMs = 24 * 60 * 60 * 1000) {
  const ids = new Map();
  return {
    has(id) {
      const timestamp = ids.get(id);
      if (!timestamp) return false;
      if (Date.now() - timestamp > ttlMs) {
        ids.delete(id);
        return false;
      }
      return true;
    },
    add(id) {
      ids.set(id, Date.now());
      if (ids.size > 10_000) {
        const oldest = ids.keys().next().value;
        ids.delete(oldest);
      }
    },
  };
}

function createApp({ env = process.env, logger = console, whatsappClient: suppliedClient } = {}) {
  const config = getConfig(env);
  const verifyToken = env.VERIFY_TOKEN || '';
  const metaAppSecret = env.META_APP_SECRET || '';
  const whatsappClient =
    suppliedClient ||
    createWhatsAppClient({
      token: env.WHATSAPP_TOKEN,
      phoneNumberId: env.PHONE_NUMBER_ID,
      graphApiVersion: env.GRAPH_API_VERSION || 'v26.0',
    });
  const bookingStore = createBookingStore({ config, whatsappClient, logger });
  const bot = new BookingBot(config, { onBooking: bookingStore.recordBooking });
  const processedMessages = createProcessedMessageCache();
  const app = express();

  app.disable('x-powered-by');
  app.use(
    express.json({
      limit: '1mb',
      verify: (request, response, buffer) => {
        request.rawBody = buffer;
      },
    }),
  );

  app.get('/healthz', (request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.get('/readyz', (request, response) => {
    const missing = ['VERIFY_TOKEN', 'WHATSAPP_TOKEN', 'PHONE_NUMBER_ID', 'META_APP_SECRET'].filter((key) => !env[key]);
    const warnings = [];
    if (!config.googleSheetsWebhookUrl) warnings.push('GOOGLE_SHEETS_WEBHOOK_URL is not configured.');
    if (!config.ownerWhatsApp) warnings.push('OWNER_WHATSAPP is not configured.');
    const ready = missing.length === 0;
    response.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      missing,
      warnings,
      whatsappConfigured: whatsappClient.configured,
    });
  });

  app.get('/webhook', (request, response) => {
    const mode = request.query['hub.mode'];
    const token = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
      return response.status(200).send(challenge);
    }
    logger.warn('Rejected webhook verification attempt');
    return response.sendStatus(403);
  });

  app.post('/webhook', async (request, response, next) => {
    const signature = request.get('x-hub-signature-256');
    if (!verifyMetaSignature(request.rawBody, signature, metaAppSecret)) {
      logger.warn('Rejected webhook with invalid Meta signature');
      return response.sendStatus(401);
    }

    const inbound = extractInboundMessages(request.body);
    if (inbound.length === 0) return response.sendStatus(200);

    try {
      for (const { message, contact } of inbound) {
        if (!message.id || processedMessages.has(message.id)) continue;
        const text = messageText(message);
        const result = await bot.handleMessage({
          customer: message.from,
          text,
          messageType: text ? message.type : 'unsupported',
          customerName: contact.profile?.name,
        });
        await whatsappClient.sendText(message.from, result.text);
        processedMessages.add(message.id);
        logger.info('Inbound WhatsApp message processed', {
          messageId: message.id,
          type: message.type,
          bookingReference: result.booking?.reference,
        });
      }
      return response.sendStatus(200);
    } catch (error) {
      logger.error('Webhook processing failed', {
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message,
      });
      return next(error);
    }
  });

  const publicDirectory = path.join(__dirname, '..', 'public');
  app.get('/test', (request, response) => response.sendFile(path.join(publicDirectory, 'index.html')));
  app.use(express.static(publicDirectory));

  app.post('/api/test-message', async (request, response, next) => {
    try {
      const customer = String(request.body?.customer || 'test-user').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
      const text = String(request.body?.text || '').trim().slice(0, 2_000);
      if (!text) return response.status(400).json({ error: 'A non-empty text message is required.' });
      const result = await bot.handleMessage({ customer, text, messageType: 'text' });
      return response.status(200).json({ reply: result.text, booking: result.booking || null });
    } catch (error) {
      return next(error);
    }
  });

  app.use((request, response) => response.status(404).json({ error: 'Not found' }));
  app.use((error, request, response, next) => {
    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ error: 'Invalid JSON body.' });
    }
    logger.error('Unhandled application error', { message: error.message });
    return response.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

module.exports = {
  createApp,
  createProcessedMessageCache,
  extractInboundMessages,
  messageText,
  verifyMetaSignature,
};
