const DEFAULT_SERVICES = [
  { id: 'braids', name: 'Knotless braids', price: 450 },
  { id: 'wig-install', name: 'Wig installation', price: 350 },
  { id: 'wash-blow', name: 'Wash and blow-dry', price: 180 },
  { id: 'nails', name: 'Gel manicure', price: 250 },
];

function parseServices(value) {
  if (!value) return DEFAULT_SERVICES;

  try {
    const parsed = JSON.parse(value);
    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      parsed.some((service) =>
        !service ||
        typeof service.id !== 'string' ||
        typeof service.name !== 'string' ||
        !Number.isFinite(Number(service.price)),
      )
    ) {
      throw new Error('SERVICES_JSON must be a non-empty array of { id, name, price }.');
    }

    return parsed.map((service) => ({
      id: service.id.trim().toLowerCase(),
      name: service.name.trim(),
      price: Number(service.price),
    }));
  } catch (error) {
    throw new Error(`Invalid SERVICES_JSON: ${error.message}`);
  }
}

function parseOptionalNumber(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error('House-call fees must be zero or a positive number.');
  }
  return number;
}

function getConfig(env = process.env) {
  const services = parseServices(env.SERVICES_JSON);
  const businessName = env.BUSINESS_NAME?.trim() || 'Glam by Thandi';

  return {
    businessName,
    currency: env.CURRENCY?.trim() || 'R',
    services,
    houseCallFee: {
      min: parseOptionalNumber(env.HOUSE_CALL_FEE_MIN, 80),
      max: parseOptionalNumber(env.HOUSE_CALL_FEE_MAX, 150),
    },
    ownerWhatsApp: (env.OWNER_WHATSAPP || '').replace(/\D/g, ''),
    ownerNotificationTemplate: env.OWNER_NOTIFICATION_TEMPLATE?.trim() || '',
    ownerNotificationTemplateLanguage: env.OWNER_NOTIFICATION_TEMPLATE_LANGUAGE?.trim() || 'en_US',
    googleSheetsWebhookUrl: env.GOOGLE_SHEETS_WEBHOOK_URL || '',
    googleSheetsWebhookSecret: env.GOOGLE_SHEETS_WEBHOOK_SECRET || '',
    knowledgeBaseJson: env.KNOWLEDGE_BASE_JSON || '',
    knowledgeBaseUrl: env.KNOWLEDGE_BASE_URL || '',
    knowledgeBaseSecret: env.KNOWLEDGE_BASE_SECRET || '',
    knowledgeBaseCacheTtlMs: parseOptionalNumber(env.KNOWLEDGE_BASE_CACHE_TTL_SECONDS, 300) * 1000,
    loadSheddingMessage:
      env.LOAD_SHEDDING_MESSAGE?.trim() ||
      'Please note: appointments may be affected by load-shedding. We will confirm your booking before your visit.',
    timeZone: env.TIME_ZONE?.trim() || 'Africa/Johannesburg',
  };
}

module.exports = { DEFAULT_SERVICES, getConfig };
