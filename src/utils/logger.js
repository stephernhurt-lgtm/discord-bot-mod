const { getSettings } = require('../database/db');
const { baseEmbed } = require('./embeds');
const { truncate } = require('./text');

const LOG_COLORS = {
  join: 0x57f287,
  leave: 0xed4245,
  message: 0x5865f2,
  moderation: 0xfee75c,
  automod: 0xeb459e,
  timeout: 0xfaa61a,
  ban: 0xed4245,
};

async function getLogChannel(guild) {
  if (!guild) return null;

  const settings = getSettings(guild.id);
  if (!settings.log_channel_id) return null;

  return guild.channels.cache.get(settings.log_channel_id)
    || await guild.channels.fetch(settings.log_channel_id).catch(() => null);
}

/**
 * Envia um embed para o canal de logs configurado.
 * Falhas são silenciosas para nunca derrubar o bot.
 */
async function sendLog(guild, options) {
  if (!guild) return;

  try {
    const channel = await getLogChannel(guild);
    if (!channel || !channel.isTextBased()) return;

    const embed = baseEmbed(guild, {
      ...options,
      footerText: options.footerText || 'Logs do servidor',
    });

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`[Logs] Falha ao enviar log em ${guild.name}:`, error.message);
  }
}

async function logModeration(guild, { action, moderator, target, reason, caseId, extra }) {
  const fields = [
    { name: 'Ação', value: action, inline: true },
    { name: 'Moderador', value: `${moderator}`, inline: true },
    { name: 'Alvo', value: `${target}`, inline: true },
    { name: 'Motivo', value: truncate(reason || 'Não informado', 1024) },
  ];

  if (caseId) {
    fields.push({ name: 'Caso', value: `#${caseId}`, inline: true });
  }

  if (extra) {
    fields.push({ name: 'Detalhes', value: truncate(extra, 1024) });
  }

  await sendLog(guild, {
    title: '🛡️ Ação de moderação',
    color: LOG_COLORS.moderation,
    fields,
  });
}

module.exports = { LOG_COLORS, sendLog, logModeration, getLogChannel };
