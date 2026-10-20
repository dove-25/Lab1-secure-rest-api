const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const configuredPath = process.env.DATABASE_PATH || './data/lab1.sqlite';
const databasePath = configuredPath === ':memory:' ? configuredPath : path.resolve(configuredPath);
if (databasePath !== ':memory:') {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

const db = new Database(databasePath);
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('alice');
if (!existingUser) {
  const passwordHash = bcrypt.hashSync('ChangeMe123!', 12);
  db.prepare(`
    INSERT INTO users (username, password_hash, display_name, email, bio)
    VALUES (?, ?, ?, ?, ?)
  `).run('alice', passwordHash, 'Alice', 'alice@example.test', 'Security learner');
}

module.exports = db;
