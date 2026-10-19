const { AuditLogEvent, Events } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../utils/logger');
const { consumeAction } = require('../utils/actionTracker');
const { findAuditEntry } = require('../utils/audit');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (consumeAction('memberRemove', member.guild.id, member.id)) return;

    const audit = await findAuditEntry(
      member.guild,
      AuditLogEvent.MemberKick,
      member.id,
    );

    const fields = [
      {
        name: 'Usuário',
        value: `${member.user} (\`${member.user.id}\`)`,
        inline: true,
      },
      {
        name: 'Membros agora',
        value: `${member.guild.memberCount}`,
        inline: true,
      },
    ];

    if (audit) {
      fields.push({
        name: 'Expulso por',
        value: `${audit.executor || 'Desconhecido'}`,
        inline: true,
      });

      if (audit.reason) {
        fields.push({ name: 'Motivo', value: audit.reason });
      }
    }

    await sendLog(member.guild, {
      title: audit ? '👢 Membro expulso' : '📤 Membro saiu',
      color: LOG_COLORS.leave,
      fields,
    });
  },
};
