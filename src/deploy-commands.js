const { REST, Routes } = require('discord.js');
const config = require('./config');
const { loadCommandModules } = require('./handlers/commandHandler');

async function deploy() {
  const commands = loadCommandModules().map((command) => command.data.toJSON());
  const rest = new REST().setToken(config.token);

  const route = config.guildId
    ? Routes.applicationGuildCommands(config.clientId, config.guildId)
    : Routes.applicationCommands(config.clientId);

  const result = await rest.put(route, { body: commands });

  console.log(
    `[Deploy] ${result.length} comando(s) registrado(s) `
    + `${config.guildId ? `no servidor ${config.guildId}` : 'globalmente'}.`,
  );
}

deploy().catch((error) => {
  console.error('[Deploy] Falha ao registrar os comandos:', error);
  process.exit(1);
});
