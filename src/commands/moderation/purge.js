const {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { sendLog, LOG_COLORS } = require('../../utils/logger');
const { ignoreDeletion } = require('../../utils/deletions');

const TWO_WEEKS = 14 * 86_400_000;

module.exports = {
  category: 'Moderação',
  requiredUserPermissions: [PermissionFlagsBits.ManageMessages],
  requiredBotPermissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory],
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Apaga várias mensagens de uma vez')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) => option
      .setName('quantidade')
      .setDescription('Quantidade de mensagens (1 a 100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100))
    .addUserOption((option) => option
      .setName('usuario')
      .setDescription('Apagar apenas mensagens deste usuário'))
    .addStringOption((option) => option
      .setName('motivo')
      .setDescription('Motivo da limpeza')
      .setMaxLength(400)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const amount = interaction.options.getInteger('quantidade', true);
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('motivo') || 'Não informado';
    const channel = interaction.channel;

    if (!channel || typeof channel.bulkDelete !== 'function') {
      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Canal incompatível',
          'Não é possível limpar mensagens neste tipo de canal. Use em canais de texto.',
        )],
      });
    }

    const fetched = await channel.messages.fetch({ limit: 100 }).catch(() => null);

    if (!fetched) {
      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Falha ao buscar mensagens',
          'Não foi possível ler o histórico do canal. Verifique as permissões do bot.',
        )],
      });
    }

    let selected = [...fetched.values()]
      .filter((message) => !user || message.author.id === user.id)
      .slice(0, amount);

    const skippedOld = selected.filter(
      (message) => Date.now() - message.createdTimestamp >= TWO_WEEKS,
    ).length;

    selected = selected.filter(
      (message) => Date.now() - message.createdTimestamp < TWO_WEEKS,
    );

    if (selected.length === 0) {
      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Nenhuma mensagem apagada',
          skippedOld > 0
            ? 'As mensagens encontradas têm mais de 14 dias e não podem ser apagadas em massa pelo Discord.'
            : 'Nenhuma mensagem foi encontrada com esses critérios.',
        )],
      });
    }

    for (const message of selected) {
      ignoreDeletion(message.id);
    }

    let deleted;

    try {
      deleted = await channel.bulkDelete(selected, true);
    } catch (error) {
      console.error('[Purge] Falha ao apagar:', error);

      return interaction.editReply({
        embeds: [errorEmbed(
          guild,
          'Falha ao apagar',
          'Verifique se o bot tem a permissão **Gerenciar Mensagens** e tente novamente.',
        )],
      });
    }

    const deletedCount = deleted.size;

    await sendLog(guild, {
      title: '🧹 Mensagens apagadas',
      color: LOG_COLORS.moderation,
      fields: [
        { name: 'Moderador', value: `${interaction.user}`, inline: true },
        { name: 'Canal', value: `<#${channel.id}>`, inline: true },
        { name: 'Quantidade', value: `${deletedCount}`, inline: true },
        {
          name: 'Filtro',
          value: user ? `Mensagens de ${user}` : 'Todas as mensagens',
          inline: true,
        },
        { name: 'Motivo', value: reason },
      ],
    });

    let description = `**${deletedCount}** mensagem(ns) apagada(s) em <#${channel.id}>.`;

    if (skippedOld > 0) {
      description += `\n\n⚠️ **${skippedOld}** mensagem(ns) com mais de 14 dias foram ignoradas pelo Discord.`;
    }

    return interaction.editReply({
      embeds: [successEmbed(guild, 'Limpeza concluída', description)],
    });
  },
};
