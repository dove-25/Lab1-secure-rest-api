const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const { z } = require('zod');
const db = require('./db');
const { requireAuth } = require('./auth');

const app = express();
// Escape HTML-sensitive characters in every JSON response without changing its data.
app.set('json escape', true);
app.use(helmet());
app.use(express.json({ limit: '32kb' }));

const loginSchema = z.object({
  login: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(128),
});

const profileSelect = `
  SELECT id, username, display_name AS displayName, email, bio, created_at AS createdAt
  FROM users
  WHERE id = ?
`;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse({
    login: req.body?.login ?? req.body?.username,
    password: req.body?.password,
  });
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid login request' });
  }

  const user = db.prepare(`
    SELECT id, username, password_hash AS passwordHash
    FROM users
    WHERE username = ?
  `).get(parsed.data.login);

  if (!user || !bcrypt.compareSync(parsed.data.password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '1h' },
  );

  return res.json({ token, tokenType: 'Bearer', expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
});

app.get('/api/data', requireAuth, (req, res) => {
  res.json({
    user: req.user.username,
    items: [
      { id: 1, title: 'Secure API notes' },
      { id: 2, title: 'Authentication checklist' },
    ],
  });
});

app.get('/api/profile', requireAuth, (req, res) => {
  const profile = db.prepare(profileSelect).get(req.user.sub);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  return res.json({ profile });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON' });
  }
  if (err.status === 413) {
    return res.status(413).json({ error: 'Request body too large' });
  }
  console.error('Request failed:', err.message);
  return res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
