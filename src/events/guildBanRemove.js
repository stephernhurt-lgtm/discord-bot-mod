const { AuditLogEvent, Events } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../utils/logger');
const { consumeAction } = require('../utils/actionTracker');
const { findAuditEntry } = require('../utils/audit');

module.exports = {
  name: Events.GuildBanRemove,
  async execute(ban) {
    if (consumeAction('unban', ban.guild.id, ban.user.id)) return;

    const audit = await findAuditEntry(
      ban.guild,
      AuditLogEvent.MemberBanRemove,
      ban.user.id,
    );

    await sendLog(ban.guild, {
      title: '🔓 Usuário desbanido',
      color: LOG_COLORS.join,
      fields: [
        {
          name: 'Usuário',
          value: `${ban.user} (\`${ban.user.id}\`)`,
          inline: true,
        },
        {
          name: 'Moderador',
          value: audit?.executor ? `${audit.executor}` : 'Desconhecido',
          inline: true,
        },
        {
          name: 'Motivo',
          value: audit?.reason || 'Não informado',
        },
      ],
    });
  },
};
