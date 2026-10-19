const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog, LOG_COLORS } = require('../../utils/logger');
const { formatDuration } = require('../../utils/time');

module.exports = {
  category: 'Moderação',
  requiredUserPermissions: [PermissionFlagsBits.ManageChannels],
  requiredBotPermissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Ativa ou altera o modo lento de um canal')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((option) => option
      .setName('segundos')
      .setDescription('Intervalo em segundos (0 desativa, máximo 21600)')
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(21_600))
    .addChannelOption((option) => option
      .setName('canal')
      .setDescription('Canal afetado (padrão: canal atual)')
      .addChannelTypes(
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.GuildForum,
      ))
    .addStringOption((option) => option
      .setName('motivo')
      .setDescription('Motivo da alteração')
      .setMaxLength(400)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const seconds = interaction.options.getInteger('segundos', true);
    const channel = interaction.options.getChannel('canal') || interaction.channel;
    const reason = interaction.options.getString('motivo') || 'Não informado';

    if (!channel || typeof channel.setRateLimitPerUser !== 'function') {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Canal inválido', 'Selecione um canal de texto ou fórum.')],
      });
    }

    try {
      await channel.setRateLimitPerUser(
        seconds,
        `${interaction.user.tag}: ${reason}`,
      );
    } catch (error) {
      console.error('[Slowmode] Falha ao alterar:', error);

      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Não foi possível alterar o modo lento',
          'Verifique se o bot tem a permissão **Gerenciar Canais**.',
        )],
      });
    }

    await sendLog(guild, {
      title: '🐢 Modo lento alterado',
      color: LOG_COLORS.moderation,
      fields: [
        { name: 'Moderador', value: `${interaction.user}`, inline: true },
        { name: 'Canal', value: `<#${channel.id}>`, inline: true },
        {
          name: 'Novo intervalo',
          value: seconds === 0 ? 'Desativado' : formatDuration(seconds * 1000),
          inline: true,
        },
        { name: 'Motivo', value: reason },
      ],
    });

    return interaction.editReply({
      embeds: [successEmbed(
        guild,
        'Modo lento atualizado',
        seconds === 0
          ? `O modo lento de <#${channel.id}> foi **desativado**.`
          : `O modo lento de <#${channel.id}> agora é de **${formatDuration(seconds * 1000)}**.`,
      )],
    });
  },
};
