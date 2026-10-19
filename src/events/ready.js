const { ActivityType, Events, REST, Routes } = require('discord.js');
const config = require('../config');
const { loadCommandModules } = require('../handlers/commandHandler');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[Bot] Online como ${client.user.tag}`);
    console.log(`[Bot] Conectado em ${client.guilds.cache.size} servidor(es).`);

    client.user.setPresence({
      status: 'online',
      activities: [{ name: 'seu servidor 🛡️', type: ActivityType.Watching }],
    });

    if (!config.autoDeploy) return;

    if (!config.guildId) {
      console.log('[Bot] Auto-deploy ignorado sem GUILD_ID. Use "npm run deploy" para comandos globais.');
      return;
    }

    try {
      const commands = loadCommandModules().map((command) => command.data.toJSON());
      const rest = new REST().setToken(config.token);
      const route = Routes.applicationGuildCommands(config.clientId, config.guildId);

      await rest.put(route, { body: commands });

      console.log(
        `[Bot] ${commands.length} comando(s) registrado(s) no servidor ${config.guildId}.`,
      );
    } catch (error) {
      console.error('[Bot] Falha ao registrar os comandos automaticamente:', error.message);
      console.error('[Bot] Use "npm run deploy" para tentar novamente.');
    }
  },
};
