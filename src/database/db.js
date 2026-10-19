const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const config = require('../config');

let db = null;

const SETTINGS_DEFAULTS = {
  brand_name: config.defaultBrandName,
  brand_color: config.defaultColor,
  brand_logo: null,
  log_channel_id: null,
};

const AUTOMOD_DEFAULTS = {
  spam_enabled: 1,
  invites_enabled: 1,
  links_enabled: 0,
  mentions_enabled: 1,
  badwords_enabled: 1,
  ghostping_enabled: 1,
  punishment: 'delete',
  timeout_duration: 600000,
  spam_count: 5,
  spam_window: 5000,
  mention_limit: 5,
  warn_autoban: 0,
  warn_threshold: 5,
  badwords: '[]',
  allowed_domains: '[]',
};

const BOOLEAN_AUTOMOD_COLUMNS = new Set([
  'spam_enabled',
  'invites_enabled',
  'links_enabled',
  'mentions_enabled',
  'badwords_enabled',
  'ghostping_enabled',
  'warn_autoban',
]);

const JSON_AUTOMOD_COLUMNS = new Set(['badwords', 'allowed_domains']);

const AUTOMOD_COLUMNS = new Set(Object.keys(AUTOMOD_DEFAULTS));
const SETTINGS_COLUMNS = new Set(Object.keys(SETTINGS_DEFAULTS));

function initDb() {
  if (db) return db;

  const dbPath = path.resolve(process.cwd(), config.dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      brand_name TEXT NOT NULL,
      brand_color TEXT NOT NULL,
      brand_logo TEXT,
      log_channel_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS automod_settings (
      guild_id TEXT PRIMARY KEY,
      spam_enabled INTEGER NOT NULL DEFAULT 1,
      invites_enabled INTEGER NOT NULL DEFAULT 1,
      links_enabled INTEGER NOT NULL DEFAULT 0,
      mentions_enabled INTEGER NOT NULL DEFAULT 1,
      badwords_enabled INTEGER NOT NULL DEFAULT 1,
      ghostping_enabled INTEGER NOT NULL DEFAULT 1,
      punishment TEXT NOT NULL DEFAULT 'delete',
      timeout_duration INTEGER NOT NULL DEFAULT 600000,
      spam_count INTEGER NOT NULL DEFAULT 5,
      spam_window INTEGER NOT NULL DEFAULT 5000,
      mention_limit INTEGER NOT NULL DEFAULT 5,
      warn_autoban INTEGER NOT NULL DEFAULT 0,
      warn_threshold INTEGER NOT NULL DEFAULT 5,
      badwords TEXT NOT NULL DEFAULT '[]',
      allowed_domains TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      type TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_warnings_guild_user
      ON warnings (guild_id, user_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_cases_guild
      ON cases (guild_id, created_at);
  `);

  return db;
}

function getDb() {
  if (!db) throw new Error('Banco de dados não inicializado. Chame initDb() primeiro.');
  return db;
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function getSettings(guildId) {
  const database = getDb();
  let row = database
    .prepare('SELECT * FROM guild_settings WHERE guild_id = ?')
    .get(guildId);

  if (!row) {
    const now = Date.now();
    database
      .prepare(`
        INSERT INTO guild_settings
          (guild_id, brand_name, brand_color, brand_logo, log_channel_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        guildId,
        SETTINGS_DEFAULTS.brand_name,
        SETTINGS_DEFAULTS.brand_color,
        SETTINGS_DEFAULTS.brand_logo,
        SETTINGS_DEFAULTS.log_channel_id,
        now,
        now,
      );

    row = database
      .prepare('SELECT * FROM guild_settings WHERE guild_id = ?')
      .get(guildId);
  }

  return row;
}

function updateSettings(guildId, patch) {
  const database = getDb();
  getSettings(guildId);

  const keys = Object.keys(patch).filter((key) => SETTINGS_COLUMNS.has(key));
  if (keys.length === 0) return getSettings(guildId);

  const assignments = keys.map((key) => `${key} = ?`).join(', ');
  const values = keys.map((key) => patch[key]);

  database
    .prepare(`UPDATE guild_settings SET ${assignments}, updated_at = ? WHERE guild_id = ?`)
    .run(...values, Date.now(), guildId);

  return getSettings(guildId);
}

function getAutomod(guildId) {
  const database = getDb();
  let row = database
    .prepare('SELECT * FROM automod_settings WHERE guild_id = ?')
    .get(guildId);

  if (!row) {
    const now = Date.now();
    const columns = Object.keys(AUTOMOD_DEFAULTS);
    const placeholders = columns.map(() => '?').join(', ');

    database
      .prepare(`
        INSERT INTO automod_settings (guild_id, ${columns.join(', ')}, updated_at)
        VALUES (?, ${placeholders}, ?)
      `)
      .run(guildId, ...columns.map((column) => AUTOMOD_DEFAULTS[column]), now);

    row = database
      .prepare('SELECT * FROM automod_settings WHERE guild_id = ?')
      .get(guildId);
  }

  return {
    ...row,
    spam_enabled: Boolean(row.spam_enabled),
    invites_enabled: Boolean(row.invites_enabled),
    links_enabled: Boolean(row.links_enabled),
    mentions_enabled: Boolean(row.mentions_enabled),
    badwords_enabled: Boolean(row.badwords_enabled),
    ghostping_enabled: Boolean(row.ghostping_enabled),
    warn_autoban: Boolean(row.warn_autoban),
    badwords: safeJsonParse(row.badwords, []),
    allowed_domains: safeJsonParse(row.allowed_domains, []),
  };
}

function updateAutomod(guildId, patch) {
  const database = getDb();
  getAutomod(guildId);

  const keys = Object.keys(patch).filter((key) => AUTOMOD_COLUMNS.has(key));
  if (keys.length === 0) return getAutomod(guildId);

  const assignments = keys.map((key) => `${key} = ?`).join(', ');
  const values = keys.map((key) => {
    const value = patch[key];
    if (BOOLEAN_AUTOMOD_COLUMNS.has(key)) return value ? 1 : 0;
    if (JSON_AUTOMOD_COLUMNS.has(key)) return JSON.stringify(value);
    return value;
  });

  database
    .prepare(`UPDATE automod_settings SET ${assignments}, updated_at = ? WHERE guild_id = ?`)
    .run(...values, Date.now(), guildId);

  return getAutomod(guildId);
}

function addWarning(guildId, userId, moderatorId, reason) {
  const database = getDb();
  const info = database
    .prepare(`
      INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(guildId, userId, moderatorId, reason, Date.now());

  return {
    id: Number(info.lastInsertRowid),
    count: countWarnings(guildId, userId),
  };
}

function getWarnings(guildId, userId) {
  return getDb()
    .prepare(`
      SELECT * FROM warnings
      WHERE guild_id = ? AND user_id = ?
      ORDER BY created_at DESC, id DESC
    `)
    .all(guildId, userId);
}

function countWarnings(guildId, userId) {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS total FROM warnings WHERE guild_id = ? AND user_id = ?')
    .get(guildId, userId);

  return row ? row.total : 0;
}

function deleteWarning(guildId, warningId) {
  const database = getDb();
  const warning = database
    .prepare('SELECT * FROM warnings WHERE id = ? AND guild_id = ?')
    .get(warningId, guildId);

  if (!warning) return null;

  database
    .prepare('DELETE FROM warnings WHERE id = ? AND guild_id = ?')
    .run(warningId, guildId);

  return warning;
}

function logCase(guildId, type, userId, moderatorId, reason) {
  const info = getDb()
    .prepare(`
      INSERT INTO cases (guild_id, type, user_id, moderator_id, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(guildId, type, userId, moderatorId, reason, Date.now());

  return Number(info.lastInsertRowid);
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDb,
  closeDb,
  getSettings,
  updateSettings,
  getAutomod,
  updateAutomod,
  addWarning,
  getWarnings,
  countWarnings,
  deleteWarning,
  logCase,
};
