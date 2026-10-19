const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../../utils/embeds');

module.exports = {
  category: 'Geral',
  requiredUserPermissions: [],
  requiredBotPermissions: [],
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Mostra todos os comandos do bot')
    .setDMPermission(false),

  async execute(interaction) {
    const categories = new Map();

    for (const command of interaction.client.commands.values()) {
      const category = command.category || 'Geral';

      if (!categories.has(category)) categories.set(category, []);
      categories.get(category).push(command);
    }

    const fields = [...categories.entries()].map(([category, commands]) => ({
      name: `📂 ${category}`,
      value: commands
        .sort((a, b) => a.data.name.localeCompare(b.data.name))
        .map((command) => `**/${command.data.name}** — ${command.data.description}`)
        .join('\n'),
    }));

    const embed = baseEmbed(interaction.guild, {
      title: '🛡️ Central de Ajuda',
      description: 'Bot de **Moderação Avançada** para Discord.\n\n'
        + '**Primeiros passos:**\n'
        + '1. Use `/config logs` para escolher o canal de logs.\n'
        + '2. Use `/config marca` para personalizar nome, cor e logo.\n'
        + '3. Use `/automod status` para revisar a proteção automática.\n\n'
        + 'Todos os comandos usam **slash commands** e respeitam as permissões de cada cargo.',
      fields,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
