const test = require('node:test');
const assert = require('node:assert/strict');
const { BookingBot } = require('../src/bot/bookingBot');
const { getConfig } = require('../src/bot/config');
const { bestMatch, createKnowledgeBase, parseEntries } = require('../src/bot/knowledgeBase');

const entries = [
  {
    id: 'hours',
    keywords: ['hours', 'opening times', 'open'],
    answer: 'We are open Monday to Saturday, 09:00 to 18:00.',
    language: 'en',
    priority: 5,
  },
  {
    id: 'location',
    keywords: ['location', 'where are you'],
    answer: 'We are in Soweto.',
    language: 'all',
  },
];

test('selects the best enabled answer for a customer question', () => {
  const parsed = parseEntries(entries);
  assert.equal(bestMatch('What are your opening times?', parsed, 'en').id, 'hours');
  assert.equal(bestMatch('Where are you located?', parsed, 'zu').id, 'location');
  assert.equal(bestMatch('What is the weather?', parsed, 'en'), null);
});

test('uses inline business knowledge for non-booking questions while preserving booking commands', async () => {
  const knowledgeBase = createKnowledgeBase({ inlineEntries: entries });
  const bot = new BookingBot(getConfig({ BUSINESS_NAME: 'Client Salon' }), { knowledgeBase });

  const answer = await bot.handleMessage({ customer: 'customer-knowledge', text: 'What are your hours?' });
  assert.equal(answer.knowledgeBaseEntryId, 'hours');
  assert.match(answer.text, /Monday to Saturday/i);

  const booking = await bot.handleMessage({ customer: 'customer-knowledge', text: '2' });
  assert.match(booking.text, /Which service/i);
});

test('caches valid remote knowledge-base entries and keeps cached answers if refresh fails', async () => {
  let calls = 0;
  const knowledgeBase = createKnowledgeBase({
    remoteUrl: 'https://example.invalid/knowledge-base',
    cacheTtlMs: 60_000,
    logger: { error() {} },
    httpClient: {
      async post() {
        calls += 1;
        return { data: { ok: true, entries } };
      },
    },
  });

  assert.equal((await knowledgeBase.answer('opening times', 'en')).id, 'hours');
  assert.equal((await knowledgeBase.answer('where are you', 'en')).id, 'location');
  assert.equal(calls, 1);
});
