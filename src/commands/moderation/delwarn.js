const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { deleteWarning } = require('../../database/db');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { logModeration } = require('../../utils/logger');

module.exports = {
  category: 'Moderação',
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
  requiredBotPermissions: [],
  data: new SlashCommandBuilder()
    .setName('delwarn')
    .setDescription('Remove uma advertência pelo ID')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption((option) => option
      .setName('id')
      .setDescription('ID da advertência (veja em /warnings)')
      .setRequired(true)
      .setMinValue(1))
    .addStringOption((option) => option
      .setName('motivo')
      .setDescription('Motivo da remoção')
      .setMaxLength(400)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const warningId = interaction.options.getInteger('id', true);
    const reason = interaction.options.getString('motivo') || 'Não informado';

    const warning = deleteWarning(guild.id, warningId);

    if (!warning) {
      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Advertência não encontrada',
          `Não existe advertência com o ID **#${warningId}** neste servidor.`,
        )],
      });
    }

    const target = `<@${warning.user_id}>`;

    await logModeration(guild, {
      action: 'Advertência removida',
      moderator: interaction.user,
      target,
      reason,
      extra: `Advertência #${warning.id} removida. Motivo original: ${warning.reason}`,
    });

    return interaction.editReply({
      embeds: [successEmbed(
        guild,
        'Advertência removida',
        `A advertência **#${warning.id}** de ${target} foi removida.\n\n**Motivo da remoção:** ${reason}`,
      )],
    });
  },
};
