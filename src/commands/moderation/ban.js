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
  requiredUserPermissions: [PermissionFlagsBits.BanMembers],
  requiredBotPermissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um usuário do servidor')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) => option
      .setName('usuario')
      .setDescription('Usuário que será banido')
      .setRequired(true))
    .addStringOption((option) => option
      .setName('motivo')
      .setDescription('Motivo do banimento')
      .setMaxLength(400))
    .addIntegerOption((option) => option
      .setName('apagar_mensagens')
      .setDescription('Apagar mensagens recentes do usuário')
      .addChoices(
        { name: 'Não apagar', value: 0 },
        { name: 'Último 1 dia', value: 1 },
        { name: 'Últimos 7 dias', value: 7 },
      )),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const user = interaction.options.getUser('usuario', true);
    const reason = interaction.options.getString('motivo') || 'Não informado';
    const days = interaction.options.getInteger('apagar_mensagens') ?? 0;

    if (user.id === interaction.user.id) {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Ação inválida', 'Você não pode banir a si mesmo.')],
      });
    }

    if (user.id === interaction.client.user.id) {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Ação inválida', 'Eu não posso banir a mim mesmo.')],
      });
    }

    const member = await guild.members.fetch(user.id).catch(() => null);

    if (member && !canModerate(interaction.member, member, guild)) {
      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Hierarquia insuficiente',
          'O cargo mais alto desse usuário é igual ou superior ao seu ou ao do bot. Mova o cargo do bot para cima e tente novamente.',
        )],
      });
    }

    const dm = baseEmbed(guild, {
      title: '🔨 Você foi banido',
      description: `Você foi banido de **${guild.name}**.`,
      color: 0xed4245,
    });

    dm.addFields(
      { name: 'Motivo', value: truncate(reason, 1024) },
      { name: 'Duração', value: 'Permanente' },
    );

    await user.send({ embeds: [dm] }).catch(() => {});

    try {
      markAction('ban', guild.id, user.id);
      markAction('memberRemove', guild.id, user.id);

      await guild.members.ban(user.id, {
        deleteMessageSeconds: days * 86_400,
        reason: `${interaction.user.tag}: ${reason}`,
      });
    } catch (error) {
      console.error('[Ban] Falha ao banir:', error);
      clearAction('ban', guild.id, user.id);
      clearAction('memberRemove', guild.id, user.id);

      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Não foi possível banir',
          'Verifique se o cargo do bot está acima do cargo do usuário e se o bot tem a permissão **Banir Membros**.',
        )],
      });
    }

    const caseId = logCase(guild.id, 'ban', user.id, interaction.user.id, reason);

    await logModeration(guild, {
      action: 'Banimento',
      moderator: interaction.user,
      target: user,
      reason,
      caseId,
      extra: days > 0 ? `${days} dia(s) de mensagens apagadas` : null,
    });

    return interaction.editReply({
      embeds: [successEmbed(
        guild,
        'Usuário banido',
        `**${user.tag}** foi banido do servidor.\n\n**Motivo:** ${reason}\n**Caso:** #${caseId}`,
      )],
    });
  },
};
