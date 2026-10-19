const ignored = new Map();
const TTL = 30_000;
const MAX_ENTRIES = 10_000;

/**
 * Evita que mensagens apagadas pelo próprio bot (AutoMod, purge, etc.)
 * gerem logs duplicados no canal de logs.
 */
function ignoreDeletion(messageId) {
  ignored.set(messageId, Date.now() + TTL);

  if (ignored.size > MAX_ENTRIES) {
    const now = Date.now();
    for (const [id, expiresAt] of ignored) {
      if (expiresAt <= now) ignored.delete(id);
    }
  }
}

function isIgnoredDeletion(messageId) {
  const expiresAt = ignored.get(messageId);
  if (!expiresAt) return false;

  if (expiresAt <= Date.now()) {
    ignored.delete(messageId);
    return false;
  }

  return true;
}

module.exports = { ignoreDeletion, isIgnoredDeletion };
