const pending = new Map();
const TTL = 20_000;

function key(type, guildId, targetId) {
  return `${type}:${guildId}:${targetId}`;
}

/**
 * Marca uma ação feita pelo bot para evitar logs duplicados
 * nos eventos nativos do Discord (ban, kick, timeout, unban).
 */
function markAction(type, guildId, targetId) {
  pending.set(key(type, guildId, targetId), Date.now() + TTL);

  if (pending.size > 5_000) {
    const now = Date.now();
    for (const [entry, expiresAt] of pending) {
      if (expiresAt <= now) pending.delete(entry);
    }
  }
}

function consumeAction(type, guildId, targetId) {
  const entry = key(type, guildId, targetId);
  const expiresAt = pending.get(entry);

  if (!expiresAt) return false;

  pending.delete(entry);
  return expiresAt > Date.now();
}

function clearAction(type, guildId, targetId) {
  pending.delete(key(type, guildId, targetId));
}

module.exports = { markAction, consumeAction, clearAction };
