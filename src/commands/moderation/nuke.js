const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const {
  getSettings,
  updateSettings,
} = require('../../database/db');
const {
  baseEmbed,
  errorEmbed,
  successEmbed,
  warningEmbed,
} = require('../../utils/embeds');
const { sendLog, LOG_COLORS } = require('../../utils/logger');

module.exports = {
  category: 'Moderação',
  requiredUserPermissions: [PermissionFlagsBits.ManageChannels],
  requiredBotPermissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Recria um canal do zero, apagando todas as mensagens')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((option) => option
      .setName('canal')
      .setDescription('Canal que será recriado (padrão: canal atual)')
      .addChannelTypes(
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
      ))
    .addStringOption((option) => option
      .setName('motivo')
      .setDescription('Motivo da recriação')
      .setMaxLength(400)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const channel = interaction.options.getChannel('canal') || interaction.channel;
    const reason = interaction.options.getString('motivo') || 'Não informado';

    if (!channel || !channel.clone || !channel.delete) {
      return interaction.editReply({
        embeds: [errorEmbed(guild, 'Canal inválido', 'Selecione um canal de texto ou anúncios.')],
      });
    }

    const warning = warningEmbed(
      guild,
      'Confirmar recriação do canal',
      `Você está prestes a **recriar** <#${channel.id}> do zero.\n\n`
      + '⚠️ Todas as mensagens, threads, pins e histórico serão **permanentemente apagados**.\n'
      + 'As permissões e o nome do canal serão mantidos.\n\n'
      + `**Motivo:** ${reason}\n\n`
      + 'Essa ação **não pode ser desfeita**. Confirme abaixo em até 30 segundos.',
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('nuke:confirm')
        .setLabel('Recriar canal')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('💥'),
      new ButtonBuilder()
        .setCustomId('nuke:cancel')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary),
    );

    const confirmation = await interaction.editReply({
      embeds: [warning],
      components: [row],
    });

    let button;

    try {
      button = await confirmation.awaitMessageComponent({
        filter: (component) => component.user.id === interaction.user.id,
        time: 30_000,
      });
    } catch {
      return interaction.editReply({
        embeds: [warningEmbed(guild, 'Tempo esgotado', 'A recriação do canal foi cancelada.')],
        components: [],
      }).catch(() => {});
    }

    if (button.customId !== 'nuke:confirm') {
      return button.update({
        embeds: [warningEmbed(guild, 'Operação cancelada', 'Nenhuma alteração foi feita no canal.')],
        components: [],
      }).catch(() => {});
    }

    await button.deferUpdate();

    const oldChannelId = channel.id;
    let newChannel;

    try {
      newChannel = await channel.clone({
        reason: `Nuke por ${interaction.user.tag}: ${reason}`,
      });

      await newChannel.setPosition(channel.position);
      await channel.delete(`Nuke por ${interaction.user.tag}: ${reason}`);
    } catch (error) {
      console.error('[Nuke] Falha ao recriar o canal:', error);

      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Não foi possível recriar o canal',
          'Verifique se o bot tem a permissão **Gerenciar Canais** e se o limite de canais do servidor não foi atingido.',
        )],
        components: [],
      }).catch(() => {});
    }

    const settings = getSettings(guild.id);
    const logWasThisChannel = settings.log_channel_id === oldChannelId;

    if (logWasThisChannel) {
      updateSettings(guild.id, { log_channel_id: newChannel.id });
    }

    await newChannel.send({
      embeds: [baseEmbed(guild, {
        title: '💥 Canal recriado',
        description: `Este canal foi recriado por ${interaction.user}.\n\n**Motivo:** ${reason}`,
        color: LOG_COLORS.moderation,
        thumbnail: false,
      })],
    }).catch(() => {});

    if (!logWasThisChannel) {
      await sendLog(guild, {
        title: '💥 Canal recriado',
        color: LOG_COLORS.automod,
        fields: [
          { name: 'Moderador', value: `${interaction.user}`, inline: true },
          { name: 'Canal', value: `<#${newChannel.id}>`, inline: true },
          { name: 'Motivo', value: reason },
        ],
      });
    }

    await interaction.editReply({
      embeds: [successEmbed(
        guild,
        'Canal recriado',
        `O canal foi recriado com sucesso como <#${newChannel.id}>.`,
      )],
      components: [],
    }).catch(() => {});
  },
};
