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
const { parseDuration, formatDuration } = require('../../utils/time');
const { truncate } = require('../../utils/text');

const MAX_TIMEOUT = 28 * 86_400_000;

module.exports = {
  category: 'Moderação',
  requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
  requiredBotPermissions: [PermissionFlagsBits.ModerateMembers],
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Silencia um usuário temporariamente')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option
      .setName('usuario')
      .setDescription('Usuário que será silenciado')
      .setRequired(true))
    .addStringOption((option) => option
      .setName('duracao')
      .setDescription('Ex: 10m, 1h, 1d. Use 0 para remover o silenciamento')
      .setRequired(true)
      .setMaxLength(20))
    .addStringOption((option) => option
      .setName('motivo')
      .setDescription('Motivo do silenciamento')
      .setMaxLength(400)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const user = interaction.options.getUser('usuario', true);
    const durationInput = interaction.options.getString('duracao', true).trim();
    const reason = interaction.options.getString('motivo') || 'Não informado';

    const remove = ['0', 'remover', 'remove', 'desmutar'].includes(durationInput.toLowerCase());
    const duration = remove ? 0 : parseDuration(durationInput);

    if (duration === null) {
      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Duração inválida',
          'Use formatos como **10m**, **1h**, **1d** ou **0** para remover o silenciamento.',
        )],
      });
    }

    if (duration > MAX_TIMEOUT) {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Duração muito longa', 'O tempo máximo de timeout é de **28 dias**.')],
      });
    }

    if (duration > 0 && duration < 1000) {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Duração inválida', 'O tempo mínimo é de **1 segundo**.')],
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

    if (duration > 0) {
      const dm = baseEmbed(guild, {
        title: '🔇 Você recebeu um timeout',
        description: `Seu acesso ao chat em **${guild.name}** foi temporariamente suspenso.`,
        color: 0xfaa61a,
      });

      dm.addFields(
        { name: 'Motivo', value: truncate(reason, 1024) },
        { name: 'Duração', value: formatDuration(duration) },
        {
          name: 'Até',
          value: `<t:${Math.floor((Date.now() + duration) / 1000)}:F>`,
        },
      );

      await user.send({ embeds: [dm] }).catch(() => {});
    }

    try {
      markAction('timeout', guild.id, user.id);
      await member.timeout(
        duration > 0 ? duration : null,
        `${interaction.user.tag}: ${reason}`,
      );
    } catch (error) {
      console.error('[Timeout] Falha ao aplicar:', error);
      clearAction('timeout', guild.id, user.id);

      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Não foi possível aplicar o timeout',
          'Verifique se o cargo do bot está acima do cargo do usuário e se ele tem a permissão **Silenciar Membros**.',
        )],
      });
    }

    const caseType = duration > 0 ? 'timeout' : 'untimeout';
    const caseId = logCase(guild.id, caseType, user.id, interaction.user.id, reason);

    await logModeration(guild, {
      action: duration > 0 ? 'Timeout aplicado' : 'Timeout removido',
      moderator: interaction.user,
      target: user,
      reason,
      caseId,
      extra: duration > 0 ? `Duração: ${formatDuration(duration)}` : null,
    });

    const description = duration > 0
      ? `**${user.tag}** foi silenciado por **${formatDuration(duration)}**.\n\n**Motivo:** ${reason}\n**Caso:** #${caseId}`
      : `O silenciamento de **${user.tag}** foi removido.\n\n**Caso:** #${caseId}`;

    return interaction.editReply({
      embeds: [successEmbed(
        guild,
        duration > 0 ? 'Timeout aplicado' : 'Timeout removido',
        description,
      )],
    });
  },
};
