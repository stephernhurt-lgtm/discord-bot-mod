require('dotenv').config({ quiet: true });

const token = (process.env.DISCORD_TOKEN || '').trim();
const clientId = (process.env.CLIENT_ID || '').trim();

if (!token || !clientId) {
  console.error('[Config] Defina DISCORD_TOKEN e CLIENT_ID no arquivo .env (veja o .env.example).');
  process.exit(1);
}

module.exports = {
  token,
  clientId,
  guildId: (process.env.GUILD_ID || '').trim() || null,
  autoDeploy: (process.env.AUTO_DEPLOY ?? 'true').toLowerCase() !== 'false',
  dbPath: (process.env.DB_PATH || './data/bot.db').trim(),
  defaultBrandName: 'Sthens Mod',
  defaultColor: '#5865F2',
};
