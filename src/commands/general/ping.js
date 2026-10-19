const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../utils/embeds');
const { formatDuration } = require('../../utils/time');

module.exports = {
  category: 'Geral',
  requiredUserPermissions: [],
  requiredBotPermissions: [],
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Mostra a latência do bot')
    .setDMPermission(false),

  async execute(interaction) {
    const roundtrip = Date.now() - interaction.createdTimestamp;

    await interaction.reply({
      embeds: [baseEmbed(interaction.guild, {
        title: '🏓 Pong!',
        color: roundtrip < 300 ? 0x57f287 : roundtrip < 800 ? 0xfee75c : 0xed4245,
        thumbnail: false,
        fields: [
          { name: 'WebSocket', value: `${interaction.client.ws.ping}ms`, inline: true },
          { name: 'Resposta', value: `${roundtrip}ms`, inline: true },
          { name: 'Uptime', value: formatDuration(interaction.client.uptime), inline: true },
        ],
      })],
    });
  },
};
