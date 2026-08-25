const axios = require('axios');

function buildOwnerMessage(booking, businessName) {
  return [
    `New ${businessName} booking request (${booking.reference})`,
    `Customer: ${booking.customerName} (${booking.customerWhatsApp})`,
    `Service: ${booking.service.name}`,
    `Appointment: ${booking.locationType === 'house_call' ? 'House call' : 'Salon'}`,
    booking.address ? `Address: ${booking.address}` : null,
    `Preferred time: ${booking.preferredDateTime}`,
    `Estimated price: ${booking.estimatedPrice}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function createBookingStore({ config, whatsappClient, httpClient = axios, logger = console }) {
  async function saveToGoogleSheets(booking) {
    if (!config.googleSheetsWebhookUrl) return { saved: false, reason: 'not_configured' };

    const response = await httpClient.post(
      config.googleSheetsWebhookUrl,
      { secret: config.googleSheetsWebhookSecret || undefined, event: 'booking.created', booking },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10_000,
        validateStatus: (status) => status >= 200 && status < 300,
      },
    );
    return { saved: true, response: response.data };
  }

  async function notifyOwner(booking) {
    if (!config.ownerWhatsApp || !whatsappClient.configured) {
      return { sent: false, reason: 'not_configured' };
    }

    try {
      const response = await whatsappClient.sendText(
        config.ownerWhatsApp,
        buildOwnerMessage(booking, config.businessName),
      );
      return { sent: true, response };
    } catch (error) {
      logger.error('Owner notification failed', {
        reference: booking.reference,
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message,
      });
      return { sent: false, reason: 'delivery_failed' };
    }
  }

  async function recordBooking(booking) {
    const sheet = await saveToGoogleSheets(booking);
    const owner = await notifyOwner(booking);

    logger.info('Booking processed', {
      reference: booking.reference,
      googleSheetsSaved: sheet.saved,
      ownerNotified: owner.sent,
    });

    return { sheet, owner };
  }

  return { recordBooking };
}

module.exports = { buildOwnerMessage, createBookingStore };
