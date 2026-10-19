const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { sendLog, LOG_COLORS } = require('../../utils/logger');

module.exports = {
  category: 'Moderação',
  requiredUserPermissions: [PermissionFlagsBits.ManageChannels],
  requiredBotPermissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Tranca ou destranca um canal para o @everyone')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) => option
      .setName('acao')
      .setDescription('Trancar ou destrancar o canal')
      .setRequired(true)
      .addChoices(
        { name: 'Trancar canal', value: 'trancar' },
        { name: 'Destrancar canal', value: 'destrancar' },
      ))
    .addChannelOption((option) => option
      .setName('canal')
      .setDescription('Canal afetado (padrão: canal atual)')
      .addChannelTypes(
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.GuildForum,
        ChannelType.GuildVoice,
        ChannelType.GuildStageVoice,
      ))
    .addStringOption((option) => option
      .setName('motivo')
      .setDescription('Motivo do lockdown')
      .setMaxLength(400)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const action = interaction.options.getString('acao', true);
    const channel = interaction.options.getChannel('canal') || interaction.channel;
    const reason = interaction.options.getString('motivo') || 'Não informado';
    const locked = action === 'trancar';

    if (!channel || typeof channel.permissionOverwrites?.edit !== 'function') {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Canal inválido', 'Selecione um canal de texto, fórum ou voz.')],
      });
    }

    const overwrites = channel.isVoiceBased()
      ? { Connect: locked ? false : null }
      : {
        SendMessages: locked ? false : null,
        SendMessagesInThreads: locked ? false : null,
        CreatePublicThreads: locked ? false : null,
        CreatePrivateThreads: locked ? false : null,
      };

    try {
      await channel.permissionOverwrites.edit(
        guild.roles.everyone,
        overwrites,
        { reason: `${interaction.user.tag}: ${reason}` },
      );
    } catch (error) {
      console.error('[Lockdown] Falha ao editar permissões:', error);

      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Não foi possível alterar o canal',
          'Verifique se o bot tem a permissão **Gerenciar Canais** e se o cargo dele está acima dos cargos afetados.',
        )],
      });
    }

    await sendLog(guild, {
      title: locked ? '🔒 Canal trancado' : '🔓 Canal destrancado',
      color: LOG_COLORS.moderation,
      fields: [
        { name: 'Moderador', value: `${interaction.user}`, inline: true },
        { name: 'Canal', value: `<#${channel.id}>`, inline: true },
        { name: 'Motivo', value: reason },
      ],
    });

    return interaction.editReply({
      embeds: [successEmbed(
        guild,
        locked ? 'Canal trancado' : 'Canal destrancado',
        `<#${channel.id}> foi ${locked ? 'trancado' : 'destrancado'} para o **@everyone**.\n\n**Motivo:** ${reason}`,
      )],
    });
  },
};
