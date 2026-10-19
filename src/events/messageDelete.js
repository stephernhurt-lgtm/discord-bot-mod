const { Events } = require('discord.js');
const { sendLog, LOG_COLORS } = require('../utils/logger');
const { isIgnoredDeletion } = require('../utils/deletions');
const { handleGhostPing } = require('../handlers/automod');
const { truncate } = require('../utils/text');

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild) return;
    if (isIgnoredDeletion(message.id)) return;

    let deleted = message;

    if (deleted.partial) {
      try {
        deleted = await deleted.fetch();
      } catch {
        return;
      }
    }

    if (deleted.author?.bot || deleted.system) return;

    await handleGhostPing(deleted);

    await sendLog(deleted.guild, {
      title: '🗑️ Mensagem apagada',
      color: LOG_COLORS.message,
      fields: [
        {
          name: 'Autor',
          value: deleted.author
            ? `${deleted.author} (\`${deleted.author.id}\`)`
            : 'Desconhecido',
          inline: true,
        },
        {
          name: 'Canal',
          value: `<#${deleted.channelId}>`,
          inline: true,
        },
        {
          name: 'Conteúdo',
          value: deleted.content
            ? truncate(deleted.content, 1024)
            : '*Sem conteúdo de texto*',
        },
      ],
    });
  },
};
