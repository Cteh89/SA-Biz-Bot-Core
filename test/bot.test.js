const test = require('node:test');
const assert = require('node:assert/strict');
const { BookingBot } = require('../src/bot/bookingBot');
const { getConfig } = require('../src/bot/config');

test('completes a salon booking and calls the booking handler once', async () => {
  const savedBookings = [];
  const bot = new BookingBot(getConfig({ BUSINESS_NAME: 'Test Salon', REQUIRE_CONSENT: 'false' }), {
    onBooking: async (booking) => savedBookings.push(booking),
  });

  assert.match((await bot.handleMessage({ customer: '27720000000', text: '2' })).text, /Which service/i);
  assert.match((await bot.handleMessage({ customer: '27720000000', text: '1' })).text, /house call/i);
  assert.match((await bot.handleMessage({ customer: '27720000000', text: '1' })).text, /preferred date and time/i);
  assert.match((await bot.handleMessage({ customer: '27720000000', text: 'Friday 14:00' })).text, /What name/i);
  const confirmation = await bot.handleMessage({ customer: '27720000000', text: 'Lerato' });
  assert.match(confirmation.text, /Estimated price: R450/i);

  const completed = await bot.handleMessage({ customer: '27720000000', text: 'yes' });
  assert.match(completed.text, /booking request has been sent/i);
  assert.equal(savedBookings.length, 1);
  assert.equal(savedBookings[0].service.id, 'braids');
  assert.equal(savedBookings[0].locationType, 'salon');
  assert.match(savedBookings[0].reference, /^SB-/);
});

test('adds a house-call estimate and permits cancellation', async () => {
  const bot = new BookingBot(getConfig({ HOUSE_CALL_FEE_MIN: '80', HOUSE_CALL_FEE_MAX: '150', REQUIRE_CONSENT: 'false' }));

  await bot.handleMessage({ customer: 'customer-2', text: '2' });
  await bot.handleMessage({ customer: 'customer-2', text: '2' });
  const locationReply = await bot.handleMessage({ customer: 'customer-2', text: '2' });
  assert.match(locationReply.text, /R80/i);
  await bot.handleMessage({ customer: 'customer-2', text: '12 Main Road, Soweto' });
  await bot.handleMessage({ customer: 'customer-2', text: 'Saturday 10:00' });
  const confirmation = await bot.handleMessage({ customer: 'customer-2', text: 'Ayanda' });
  assert.match(confirmation.text, /Estimated price: R430/i);
  const cancelled = await bot.handleMessage({ customer: 'customer-2', text: 'cancel' });
  assert.match(cancelled.text, /cancelled/i);
});

test('requires consent before starting a booking by default', async () => {
  const bot = new BookingBot(getConfig({ BUSINESS_NAME: 'Consent Salon' }));

  const consent = await bot.handleMessage({ customer: 'customer-consent', text: '2' });
  assert.match(consent.text, /may we save your WhatsApp number/i);

  const servicePrompt = await bot.handleMessage({ customer: 'customer-consent', text: 'yes' });
  assert.match(servicePrompt.text, /Which service/i);
});

test('uses a client-specific consent template', async () => {
  const bot = new BookingBot(getConfig({
    BUSINESS_NAME: 'Custom Salon',
    BOT_COPY_JSON: JSON.stringify({ en: { consent: 'Welcome to {{businessName}}. Reply yes to continue.' } }),
  }));

  const response = await bot.handleMessage({ customer: 'customer-template', text: '2' });
  assert.equal(response.text, 'Welcome to Custom Salon. Reply yes to continue.');
});

test('responds in Zulu when the customer starts in Zulu', async () => {
  const bot = new BookingBot(getConfig({ BUSINESS_NAME: 'Test Salon' }));
  const response = await bot.handleMessage({ customer: 'customer-3', text: 'Sawubona' });
  assert.match(response.text, /Wamukelekile/i);
});
