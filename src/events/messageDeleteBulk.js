const { Events } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../utils/logger');
const { isIgnoredDeletion } = require('../utils/deletions');

module.exports = {
  name: Events.MessageDeleteBulk,
  async execute(messages, channel) {
    if (!channel.guild) return;

    const relevant = [...messages.values()].filter((message) => (
      !isIgnoredDeletion(message.id)
      && !message.author?.bot
    ));

    if (relevant.length === 0) return;

    const authorIds = [...new Set(
      relevant.map((message) => message.author?.id).filter(Boolean),
    )].slice(0, 10);

    await sendLog(channel.guild, {
      title: '🧹 Mensagens apagadas em massa',
      color: LOG_COLORS.message,
      fields: [
        { name: 'Canal', value: `<#${channel.id}>`, inline: true },
        { name: 'Quantidade', value: `${relevant.length}`, inline: true },
        {
          name: 'Autores',
          value: authorIds.length > 0
            ? authorIds.map((id) => `<@${id}>`).join(', ')
            : 'Desconhecidos',
        },
      ],
    });
  },
};
