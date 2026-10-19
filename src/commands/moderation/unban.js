const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { logCase } = require('../../database/db');
const { baseEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { logModeration } = require('../../utils/logger');
const { markAction, clearAction } = require('../../utils/actionTracker');

module.exports = {
  category: 'Moderação',
  requiredUserPermissions: [PermissionFlagsBits.BanMembers],
  requiredBotPermissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Remove o banimento de um usuário')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) => option
      .setName('id')
      .setDescription('ID do usuário banido')
      .setRequired(true)
      .setMinLength(17)
      .setMaxLength(20))
    .addStringOption((option) => option
      .setName('motivo')
      .setDescription('Motivo do desbanimento')
      .setMaxLength(400)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const userId = interaction.options.getString('id', true).trim();
    const reason = interaction.options.getString('motivo') || 'Não informado';

    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'ID inválido', 'Informe o ID numérico de um usuário.')],
      });
    }

    const ban = await guild.bans.fetch(userId).catch(() => null);

    if (!ban) {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Usuário não encontrado', 'Esse usuário não está banido neste servidor.')],
      });
    }

    try {
      markAction('unban', guild.id, userId);
      await guild.members.unban(userId, `${interaction.user.tag}: ${reason}`);
    } catch (error) {
      console.error('[Unban] Falha ao desbanir:', error);
      clearAction('unban', guild.id, userId);

      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Não foi possível desbanir',
          'Verifique se o bot tem a permissão **Banir Membros**.',
        )],
      });
    }

    const user = ban.user;
    const dm = baseEmbed(guild, {
      title: '🔓 Banimento removido',
      description: `Seu banimento de **${guild.name}** foi removido. Você pode entrar novamente pelo convite do servidor.`,
      color: 0x57f287,
    });

    await user.send({ embeds: [dm] }).catch(() => {});

    const caseId = logCase(guild.id, 'unban', user.id, interaction.user.id, reason);

    await logModeration(guild, {
      action: 'Desbanimento',
      moderator: interaction.user,
      target: user,
      reason,
      caseId,
    });

    return interaction.editReply({
      embeds: [successEmbed(
        guild,
        'Usuário desbanido',
        `**${user.tag}** foi desbanido.\n\n**Motivo:** ${reason}\n**Caso:** #${caseId}`,
      )],
    });
  },
};
