function truncate(text, maxLength = 1024) {
  if (text === null || text === undefined) return '';
  const value = String(text);
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsBadWord(content, badwords) {
  if (!content || !Array.isArray(badwords) || badwords.length === 0) return false;

  const normalized = content.toLocaleLowerCase('pt-BR');

  return badwords.some((word) => {
    const normalizedWord = String(word).trim().toLocaleLowerCase('pt-BR');
    if (!normalizedWord) return false;

    try {
      const pattern = new RegExp(
        `(?<![\\p{L}\\p{N}])${escapeRegExp(normalizedWord)}(?![\\p{L}\\p{N}])`,
        'iu',
      );
      return pattern.test(normalized);
    } catch {
      return normalized.includes(normalizedWord);
    }
  });
}

function extractDomain(link) {
  try {
    const cleaned = String(link).replace(/[.,!?;:]+$/, '');
    return new URL(cleaned).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isDomainAllowed(hostname, allowedDomains) {
  if (!hostname) return false;

  return allowedDomains.some((domain) => {
    const normalizedDomain = String(domain).toLowerCase().replace(/^www\./, '');
    return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`);
  });
}

module.exports = { truncate, containsBadWord, extractDomain, isDomainAllowed };
