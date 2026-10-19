const { Events, MessageFlags } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');
const { formatPermissions } = require('../utils/permissions');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.inGuild()) {
      await interaction.reply({
        embeds: [errorEmbed(null, 'Servidor necessário', 'Este bot só funciona dentro de servidores.')],
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
      return;
    }

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    const userPermissions = command.requiredUserPermissions || [];
    if (userPermissions.length > 0 && !interaction.memberPermissions?.has(userPermissions)) {
      const missing = formatPermissions(userPermissions);

      await interaction.reply({
        embeds: [errorEmbed(
          interaction.guild,
          'Sem permissão',
          `Você precisa da(s) permissão(ões): **${missing}**.`,
        )],
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
      return;
    }

    const botPermissions = command.requiredBotPermissions || [];
    const botMember = interaction.guild.members.me;

    if (botPermissions.length > 0 && (!botMember || !botMember.permissions.has(botPermissions))) {
      const missing = formatPermissions(botPermissions);

      await interaction.reply({
        embeds: [errorEmbed(
          interaction.guild,
          'Permissões do bot',
          `O bot precisa da(s) permissão(ões): **${missing}**. Ajuste o cargo do bot e tente novamente.`,
        )],
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(
        `[Comando:${interaction.commandName}] Usuário ${interaction.user.id} | Servidor ${interaction.guildId}:`,
        error,
      );

      const payload = {
        embeds: [errorEmbed(
          interaction.guild,
          'Erro inesperado',
          'Não foi possível concluir esta ação. Verifique as permissões do bot e tente novamente.',
        )],
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
