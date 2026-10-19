/**
 * Busca o executor e o motivo de uma ação recente nos logs de auditoria.
 * Retorna null quando o bot não tem a permissão "Ver Registro de Auditoria".
 */
async function findAuditEntry(guild, type, targetId, maxAge = 20_000) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 6 });
    const entry = logs.entries.find((item) => (
      item.targetId === String(targetId)
      && Date.now() - item.createdTimestamp < maxAge
    ));

    if (!entry) return null;

    return {
      executor: entry.executor || null,
      reason: entry.reason || null,
    };
  } catch {
    return null;
  }
}

module.exports = { findAuditEntry };
