const { Events } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../utils/logger');
const { truncate } = require('../utils/text');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot || newMessage.system) return;

    let updated = newMessage;

    if (updated.partial) {
      try {
        updated = await updated.fetch();
      } catch {
        return;
      }
    }

    const before = oldMessage.partial ? null : oldMessage.content;
    const after = updated.content;

    if (before === after) return;
    if (before === null && !after) return;

    await sendLog(updated.guild, {
      title: '✏️ Mensagem editada',
      color: LOG_COLORS.message,
      fields: [
        {
          name: 'Autor',
          value: `${updated.author} (\`${updated.author.id}\`)`,
          inline: true,
        },
        {
          name: 'Canal',
          value: `<#${updated.channelId}>`,
          inline: true,
        },
        {
          name: 'Antes',
          value: before ? truncate(before, 1024) : '*Conteúdo anterior indisponível*',
        },
        {
          name: 'Depois',
          value: after ? truncate(after, 1024) : '*Mensagem sem texto*',
        },
        {
          name: 'Link',
          value: `[Ir para a mensagem](${updated.url})`,
        },
      ],
    });
  },
};
