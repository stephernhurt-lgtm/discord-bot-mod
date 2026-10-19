const { AuditLogEvent, Events } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../utils/logger');
const { consumeAction } = require('../utils/actionTracker');
const { findAuditEntry } = require('../utils/audit');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const oldUntil = oldMember.communicationDisabledUntilTimestamp || 0;
    const newUntil = newMember.communicationDisabledUntilTimestamp || 0;

    if (oldUntil === newUntil) return;
    if (consumeAction('timeout', newMember.guild.id, newMember.id)) return;

    const active = newUntil > Date.now();

    const audit = active
      ? await findAuditEntry(
        newMember.guild,
        AuditLogEvent.MemberUpdate,
        newMember.id,
      )
      : null;

    const fields = [
      {
        name: 'Usuário',
        value: `${newMember.user} (\`${newMember.user.id}\`)`,
        inline: true,
      },
      {
        name: active ? 'Silenciado até' : 'Silenciamento removido',
        value: active
          ? `<t:${Math.floor(newUntil / 1000)}:F> (<t:${Math.floor(newUntil / 1000)}:R>)`
          : `<t:${Math.floor(oldUntil / 1000)}:R>`,
        inline: true,
      },
    ];

    if (audit?.executor) {
      fields.push({
        name: 'Moderador',
        value: `${audit.executor}`,
        inline: true,
      });
    }

    if (audit?.reason) {
      fields.push({ name: 'Motivo', value: audit.reason });
    }

    await sendLog(newMember.guild, {
      title: active ? '🔇 Timeout aplicado' : '🔊 Timeout removido',
      color: LOG_COLORS.timeout,
      fields,
    });
  },
};
