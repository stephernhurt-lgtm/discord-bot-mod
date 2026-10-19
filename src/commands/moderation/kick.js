const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { logCase } = require('../../database/db');
const { baseEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { canModerate } = require('../../utils/permissions');
const { logModeration } = require('../../utils/logger');
const { markAction, clearAction } = require('../../utils/actionTracker');
const { truncate } = require('../../utils/text');

module.exports = {
  category: 'Moderação',
  requiredUserPermissions: [PermissionFlagsBits.KickMembers],
  requiredBotPermissions: [PermissionFlagsBits.KickMembers],
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa um usuário do servidor')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) => option
      .setName('usuario')
      .setDescription('Usuário que será expulso')
      .setRequired(true))
    .addStringOption((option) => option
      .setName('motivo')
      .setDescription('Motivo da expulsão')
      .setMaxLength(400)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo') || 'Não informado';

    if (user.id === interaction.user.id) {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Ação inválida', 'Você não pode expulsar a si mesmo.')],
      });
    }

    const member = await guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Usuário não encontrado', 'Esse usuário não está no servidor.')],
      });
    }

    if (!canModerate(interaction.member, member, guild)) {
      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Hierarquia insuficiente',
          'O cargo mais alto desse usuário é igual ou superior ao seu ou ao do bot.',
        )],
      });
    }

    const dm = baseEmbed(guild, {
      title: '👢 Você foi expulso',
      description: `Você foi expulso de **${guild.name}**.`,
      color: 0xed4245,
    });

    dm.addFields({ name: 'Motivo', value: truncate(reason, 1024) });
    await user.send({ embeds: [dm] }).catch(() => {});

    try {
      markAction('kick', guild.id, user.id);
      markAction('memberRemove', guild.id, user.id);

      await member.kick(`${interaction.user.tag}: ${reason}`);
    } catch (error) {
      console.error('[Kick] Falha ao expulsar:', error);
      clearAction('kick', guild.id, user.id);
      clearAction('memberRemove', guild.id, user.id);

      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Não foi possível expulsar',
          'Verifique se o cargo do bot está acima do cargo do usuário e se o bot tem a permissão **Expulsar Membros**.',
        )],
      });
    }

    const caseId = logCase(guild.id, 'kick', user.id, interaction.user.id, reason);

    await logModeration(guild, {
      action: 'Expulsão',
      moderator: interaction.user,
      target: user,
      reason,
      caseId,
    });

    return interaction.editReply({
      embeds: [successEmbed(
        guild,
        'Usuário expulso',
        `**${user.tag}** foi expulso do servidor.\n\n**Motivo:** ${reason}\n**Caso:** #${caseId}`,
      )],
    });
  },
};
