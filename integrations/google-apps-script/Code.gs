/**
 * Google Apps Script receiver for SA Biz Bot bookings.
 *
 * Before deployment, open Project Settings > Script properties and set:
 *   BOOKING_SHEET_ID     The ID from the Google Sheet URL.
 *   BOOKING_WEBHOOK_SECRET  A long random secret that matches Render.
 *
 * Deploy as a Web app that executes as you and is accessible to anyone.
 * The bot authenticates every request with BOOKING_WEBHOOK_SECRET.
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty('BOOKING_WEBHOOK_SECRET');

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }
    if (payload.event !== 'booking.created' || !payload.booking) {
      return jsonResponse({ ok: false, error: 'Invalid event payload' });
    }

    const booking = payload.booking;
    const spreadsheetId = properties.getProperty('BOOKING_SHEET_ID');
    if (!spreadsheetId) throw new Error('Missing BOOKING_SHEET_ID script property.');

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('Bookings') || spreadsheet.insertSheet('Bookings');
    ensureHeaders(sheet);

    const existingReferences = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat()
      : [];
    if (!existingReferences.includes(booking.reference)) {
      sheet.appendRow([
        booking.reference,
        booking.createdAt,
        booking.customerName,
        booking.customerWhatsApp,
        booking.service && booking.service.name,
        booking.locationType,
        booking.address || '',
        booking.preferredDateTime,
        booking.estimatedPrice,
        'new',
      ]);
    }

    return jsonResponse({ ok: true, reference: booking.reference });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error.message });
  }
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    'Reference',
    'Created at (UTC)',
    'Customer name',
    'Customer WhatsApp',
    'Service',
    'Appointment type',
    'Address',
    'Preferred time',
    'Estimated price',
    'Status',
  ]);
  sheet.setFrozenRows(1);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
