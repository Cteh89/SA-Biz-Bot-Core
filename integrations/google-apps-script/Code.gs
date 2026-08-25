/**
 * Google Apps Script receiver for SA Biz Bot bookings and per-business knowledge bases.
 *
 * Before deployment, open Project Settings > Script properties and set:
 *   BOOKING_SHEET_ID        The ID from the Google Sheet URL.
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

    const spreadsheetId = properties.getProperty('BOOKING_SHEET_ID');
    if (!spreadsheetId) throw new Error('Missing BOOKING_SHEET_ID script property.');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    if (payload.event === 'booking.created') {
      return jsonResponse(saveBooking(spreadsheet, payload.booking));
    }
    if (payload.event === 'knowledge_base.get') {
      return jsonResponse(getKnowledgeBase(spreadsheet));
    }

    return jsonResponse({ ok: false, error: 'Invalid event payload' });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, error: error.message });
  }
}

function saveBooking(spreadsheet, booking) {
  if (!booking || !booking.reference) return { ok: false, error: 'Invalid booking payload' };

  const sheet = spreadsheet.getSheetByName('Bookings') || spreadsheet.insertSheet('Bookings');
  ensureBookingHeaders(sheet);

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

  return { ok: true, reference: booking.reference };
}

function getKnowledgeBase(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('KnowledgeBase') || spreadsheet.insertSheet('KnowledgeBase');
  ensureKnowledgeBaseHeaders(sheet);
  if (sheet.getLastRow() <= 1) return { ok: true, entries: [] };

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  const entries = rows
    .filter((row) => row[2] && String(row[4]).toLowerCase() !== 'false')
    .map((row, index) => ({
      id: row[0] || `sheet-${index + 1}`,
      keywords: String(row[1] || '').split(',').map((keyword) => keyword.trim()).filter(Boolean),
      answer: String(row[2]),
      language: String(row[3] || 'all').toLowerCase(),
      enabled: String(row[4]).toLowerCase() !== 'false',
      priority: Number(row[5] || 0),
    }));

  return { ok: true, entries };
}

function ensureBookingHeaders(sheet) {
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

function ensureKnowledgeBaseHeaders(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(['ID', 'Keywords (comma-separated)', 'Answer', 'Language (all/en/zu/st)', 'Enabled (TRUE/FALSE)', 'Priority']);
  sheet.appendRow([
    'location',
    'where are you,location,address,located',
    'We are based in Soweto. Please ask for the nearest available salon location when you book.',
    'en',
    'TRUE',
    '10',
  ]);
  sheet.setFrozenRows(1);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
