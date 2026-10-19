const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} = require('discord.js');
const config = require('./config');
const { initDb, closeDb } = require('./database/db');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.User,
  ],
});

client.commands = new Collection();

initDb();
loadCommands(client);
loadEvents(client);

client.login(config.token).catch((error) => {
  console.error('[Bot] Falha ao conectar:', error);
  closeDb();
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('[Bot] Promessa rejeitada sem tratamento:', error);
});

process.on('uncaughtException', (error) => {
  console.error('[Bot] Exceção não capturada. Encerrando para permitir o reinício:', error);
  closeDb();
  process.exit(1);
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n[Bot] Recebido ${signal}. Encerrando com segurança...`);
  client.destroy();
  closeDb();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
