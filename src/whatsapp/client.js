const axios = require('axios');

function normalizeRecipient(to) {
  const digits = String(to || '').replace(/[^0-9]/g, '');
  if (!digits) throw new Error('A valid recipient phone number is required.');
  return `+${digits}`;
}

function createWhatsAppClient({ token, phoneNumberId, graphApiVersion = 'v26.0', httpClient = axios }) {
  const configured = Boolean(token && phoneNumberId);
  const endpoint = configured
    ? `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`
    : null;

  async function sendText(to, body) {
    if (!configured) {
      throw new Error('WhatsApp Cloud API is not configured. Set WHATSAPP_TOKEN and PHONE_NUMBER_ID.');
    }
    if (!to || !body) throw new Error('Both recipient and message body are required.');

    const response = await httpClient.post(
      endpoint,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizeRecipient(to),
        type: 'text',
        text: { preview_url: false, body },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      },
    );

    return response.data;
  }

  async function sendTemplate(to, name, languageCode = 'en_US', components = []) {
    if (!configured) {
      throw new Error('WhatsApp Cloud API is not configured. Set WHATSAPP_TOKEN and PHONE_NUMBER_ID.');
    }

    const response = await httpClient.post(
      endpoint,
      {
        messaging_product: 'whatsapp',
        to: normalizeRecipient(to),
        type: 'template',
        template: { name, language: { code: languageCode }, ...(components.length ? { components } : {}) },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      },
    );

    return response.data;
  }

  return { configured, sendText, sendTemplate };
}

module.exports = { createWhatsAppClient, normalizeRecipient };
