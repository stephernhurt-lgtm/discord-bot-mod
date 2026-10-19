const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { getWarnings } = require('../../database/db');
const { baseEmbed, errorEmbed } = require('../../utils/embeds');
const { truncate } = require('../../utils/text');

module.exports = {
  category: 'Moderação',
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
  requiredBotPermissions: [],
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Mostra o histórico de advertências de um usuário')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option
      .setName('usuario')
      .setDescription('Usuário consultado')
      .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const user = interaction.options.getUser('usuario', true);
    const warnings = getWarnings(guild.id, user.id);

    if (warnings.length === 0) {
      return interaction.editReply({
        embeds: [baseEmbed(guild, {
          title: '📋 Histórico de advertências',
          description: `**${user.tag}** não possui nenhuma advertência registrada.`,
          color: 0x57f287,
          thumbnail: false,
        })],
      });
    }

    const displayed = warnings.slice(0, 15);

    let description = displayed
      .map((warning) => {
        const date = `<t:${Math.floor(warning.created_at / 1000)}:d>`;
        return `**#${warning.id}** • ${date} • por <@${warning.moderator_id}>\n`
          + `> ${truncate(warning.reason, 180)}`;
      })
      .join('\n\n');

    if (description.length > 3900) {
      description = `${description.slice(0, 3897)}...`;
    }

    if (warnings.length > displayed.length) {
      description += `\n\n*Mostrando as ${displayed.length} advertências mais recentes de ${warnings.length}.*`;
    }

    return interaction.editReply({
      embeds: [baseEmbed(guild, {
        title: `📋 Advertências de ${user.tag}`,
        description,
        color: 0xfee75c,
        fields: [
          { name: 'Total', value: `${warnings.length}`, inline: true },
          { name: 'Usuário', value: `${user}`, inline: true },
        ],
      })],
    });
  },
};
