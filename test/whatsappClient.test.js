const test = require('node:test');
const assert = require('node:assert/strict');
const { createWhatsAppClient, normalizeRecipient } = require('../src/whatsapp/client');

test('normalizes WhatsApp recipients to E.164 form', () => {
  assert.equal(normalizeRecipient('2772 000 0000'), '+27720000000');
  assert.equal(normalizeRecipient('+27720000000'), '+27720000000');
  assert.throws(() => normalizeRecipient('not-a-number'), /valid recipient/i);
});

test('sends normalized recipients to the configured Cloud API endpoint', async () => {
  const calls = [];
  const client = createWhatsAppClient({
    token: 'test-token',
    phoneNumberId: '123456',
    graphApiVersion: 'v26.0',
    httpClient: {
      async post(url, body, options) {
        calls.push({ url, body, options });
        return { data: { messages: [{ id: 'wamid.outbound' }] } };
      },
    },
  });

  await client.sendText('27720000000', 'Hello');
  assert.equal(calls[0].url, 'https://graph.facebook.com/v26.0/123456/messages');
  assert.equal(calls[0].body.to, '+27720000000');
  assert.equal(calls[0].body.text.body, 'Hello');
});
