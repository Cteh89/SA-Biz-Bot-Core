const axios = require('axios');

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseEntries(value, source = 'KNOWLEDGE_BASE_JSON') {
  if (!value) return [];

  let entries;
  try {
    entries = typeof value === 'string' ? JSON.parse(value) : value;
  } catch (error) {
    throw new Error(`${source} must contain valid JSON: ${error.message}`);
  }

  if (!Array.isArray(entries)) {
    throw new Error(`${source} must be an array of knowledge-base entries.`);
  }

  return entries
    .map((entry, index) => ({
      id: String(entry.id || `entry-${index + 1}`).trim(),
      keywords: Array.isArray(entry.keywords)
        ? entry.keywords.map(normalize).filter(Boolean)
        : String(entry.keywords || '')
            .split(',')
            .map(normalize)
            .filter(Boolean),
      answer: String(entry.answer || '').trim(),
      language: String(entry.language || 'all').trim().toLowerCase(),
      enabled: entry.enabled !== false && String(entry.enabled || '').toLowerCase() !== 'false',
      priority: Number.isFinite(Number(entry.priority)) ? Number(entry.priority) : 0,
    }))
    .filter((entry) => entry.answer && entry.keywords.length > 0);
}

function bestMatch(message, entries, language = 'en') {
  const question = normalize(message);
  if (!question) return null;

  const candidates = entries
    .filter((entry) => entry.enabled && (entry.language === 'all' || entry.language === language))
    .map((entry) => {
      const score = entry.keywords.reduce((total, keyword) => {
        if (question === keyword) return total + 100 + keyword.length;
        if (question.includes(keyword)) return total + 20 + keyword.length;
        const keywordWords = keyword.split(' ');
        const matches = keywordWords.filter((word) => question.split(' ').includes(word)).length;
        return total + (matches === keywordWords.length && matches > 0 ? matches * 3 : 0);
      }, 0);
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || right.entry.priority - left.entry.priority);

  return candidates[0]?.entry || null;
}

function createKnowledgeBase({
  inlineEntries = [],
  remoteUrl = '',
  remoteSecret = '',
  cacheTtlMs = 300_000,
  httpClient = axios,
  logger = console,
} = {}) {
  const inline = parseEntries(inlineEntries, 'inline knowledge base');
  let cachedRemoteEntries = null;
  let cacheExpiresAt = 0;

  async function loadEntries() {
    if (!remoteUrl) return inline;
    if (cachedRemoteEntries && Date.now() < cacheExpiresAt) return [...inline, ...cachedRemoteEntries];

    try {
      const response = await httpClient.post(
        remoteUrl,
        { event: 'knowledge_base.get', secret: remoteSecret || undefined },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8_000 },
      );
      if (!response.data?.ok || !Array.isArray(response.data.entries)) {
        throw new Error('Knowledge-base endpoint returned an invalid response.');
      }
      cachedRemoteEntries = parseEntries(response.data.entries, 'remote knowledge base');
      cacheExpiresAt = Date.now() + cacheTtlMs;
      return [...inline, ...cachedRemoteEntries];
    } catch (error) {
      logger.error('Knowledge-base refresh failed; falling back to cached or inline answers.', {
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
      });
      return [...inline, ...(cachedRemoteEntries || [])];
    }
  }

  async function answer(message, language) {
    const entries = await loadEntries();
    return bestMatch(message, entries, language);
  }

  function invalidateCache() {
    cacheExpiresAt = 0;
  }

  return { answer, invalidateCache, loadEntries };
}

module.exports = { bestMatch, createKnowledgeBase, normalize, parseEntries };
