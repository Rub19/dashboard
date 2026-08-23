import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let db;

export function initDatabase() {
  db = new Database(join(__dirname, '..', 'data.db'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      coins INTEGER DEFAULT 0,
      last_daily TEXT DEFAULT NULL,
      last_xp TEXT DEFAULT NULL,
      warnings INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, guild_id)
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message TEXT NOT NULL,
      remind_at INTEGER NOT NULL
    );
  `);

  startReminderLoop();
  return db;
}

export function getDb() {
  return db;
}

export function getUser(userId, guildId) {
  const user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) {
    db.prepare('INSERT INTO users (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
    return db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  }
  return user;
}

export function addXp(userId, guildId, amount) {
  const user = getUser(userId, guildId);
  const newXp = user.xp + amount;
  const xpNeeded = user.level * 100;
  let leveled = false;

  if (newXp >= xpNeeded) {
    db.prepare('UPDATE users SET xp = ?, level = level + 1 WHERE user_id = ? AND guild_id = ?')
      .run(newXp - xpNeeded, userId, guildId);
    leveled = true;
  } else {
    db.prepare('UPDATE users SET xp = ? WHERE user_id = ? AND guild_id = ?').run(newXp, userId, guildId);
  }

  return { leveled, newLevel: leveled ? user.level + 1 : user.level };
}

export function addCoins(userId, guildId, amount) {
  getUser(userId, guildId);
  db.prepare('UPDATE users SET coins = coins + ? WHERE user_id = ? AND guild_id = ?').run(amount, userId, guildId);
}

export function getLeaderboard(guildId, limit = 10) {
  return db.prepare(
    'SELECT user_id, level, xp, coins FROM users WHERE guild_id = ? ORDER BY level DESC, xp DESC LIMIT ?'
  ).all(guildId, limit);
}

export function addWarning(userId, guildId, reason, moderatorId) {
  db.prepare('INSERT INTO warnings (user_id, guild_id, reason, moderator_id) VALUES (?, ?, ?, ?)')
    .run(userId, guildId, reason, moderatorId);
  db.prepare('UPDATE users SET warnings = warnings + 1 WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

export function getWarnings(userId, guildId) {
  return db.prepare('SELECT * FROM warnings WHERE user_id = ? AND guild_id = ? ORDER BY created_at DESC').all(userId, guildId);
}

export function clearWarnings(userId, guildId) {
  db.prepare('DELETE FROM warnings WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  db.prepare('UPDATE users SET warnings = 0 WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
}

export function addReminder(userId, channelId, message, remindAt) {
  return db.prepare('INSERT INTO reminders (user_id, channel_id, message, remind_at) VALUES (?, ?, ?, ?)')
    .run(userId, channelId, message, remindAt).lastInsertRowid;
}

let _client;
export function setClient(client) { _client = client; }

function startReminderLoop() {
  setInterval(() => {
    if (!_client) return;
    const now = Date.now();
    const due = db.prepare('SELECT * FROM reminders WHERE remind_at <= ?').all(now);
    for (const reminder of due) {
      const channel = _client.channels.cache.get(reminder.channel_id);
      if (channel) {
        channel.send(`<@${reminder.user_id}> ⏰ Rappel : **${reminder.message}**`);
      }
      db.prepare('DELETE FROM reminders WHERE id = ?').run(reminder.id);
    }
  }, 10000);
}
