const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, extractInboundMessages, verifyMetaSignature } = require('../src/app');

function makePayload(messageId = 'wamid.test-1', body = '1') {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              metadata: { phone_number_id: '123' },
              contacts: [{ wa_id: '27720000000', profile: { name: 'Test Customer' } }],
              messages: [{ id: messageId, from: '27720000000', type: 'text', text: { body } }],
            },
          },
        ],
      },
    ],
  };
}

async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test('verifies only the matching Meta verify token', async () => {
  const app = createApp({ env: { VERIFY_TOKEN: 'test-token' }, logger: { info() {}, warn() {}, error() {} } });
  await withServer(app, async (baseUrl) => {
    const approved = await fetch(`${baseUrl}/webhook?hub.mode=subscribe&hub.verify_token=test-token&hub.challenge=abc123`);
    assert.equal(approved.status, 200);
    assert.equal(await approved.text(), 'abc123');

    const rejected = await fetch(`${baseUrl}/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123`);
    assert.equal(rejected.status, 403);
  });
});

test('processes an inbound message once and sends the bot response', async () => {
  const sent = [];
  const fakeWhatsApp = {
    configured: true,
    async sendText(to, body) {
      sent.push({ to, body });
      return { messages: [{ id: 'outbound-test-id' }] };
    },
  };
  const app = createApp({
    env: { VERIFY_TOKEN: 'test-token', WHATSAPP_TOKEN: 'token', PHONE_NUMBER_ID: 'id' },
    whatsappClient: fakeWhatsApp,
    logger: { info() {}, warn() {}, error() {} },
  });

  await withServer(app, async (baseUrl) => {
    const first = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makePayload()),
    });
    assert.equal(first.status, 200);
    assert.equal(sent.length, 1);
    assert.match(sent[0].body, /current services/i);

    const duplicate = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makePayload()),
    });
    assert.equal(duplicate.status, 200);
    assert.equal(sent.length, 1);
  });
});

test('extracts WhatsApp messages and validates HMAC signatures', () => {
  assert.equal(extractInboundMessages(makePayload()).length, 1);
  assert.equal(extractInboundMessages({ object: 'not-whatsapp' }).length, 0);

  const body = Buffer.from('{"ok":true}');
  const signature = `sha256=${require('crypto').createHmac('sha256', 'secret').update(body).digest('hex')}`;
  assert.equal(verifyMetaSignature(body, signature, 'secret'), true);
  assert.equal(verifyMetaSignature(body, 'sha256=invalid', 'secret'), false);
});
