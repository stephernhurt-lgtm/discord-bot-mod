const { Events } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    await sendLog(member.guild, {
      title: '📥 Membro entrou',
      color: LOG_COLORS.join,
      fields: [
        {
          name: 'Usuário',
          value: `${member.user} (\`${member.user.id}\`)`,
          inline: true,
        },
        {
          name: 'Conta criada',
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: 'Membros agora',
          value: `${member.guild.memberCount}`,
          inline: true,
        },
      ],
    });
  },
};
