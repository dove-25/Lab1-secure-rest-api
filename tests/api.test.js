process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.DATABASE_PATH = ':memory:';

const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const db = require('../src/db');

afterAll(() => db.close());

describe('secure API', () => {
  test('rejects access to protected data without a token', async () => {
    const response = await request(app).get('/api/data');
    expect(response.status).toBe(401);
  });

  test('logs in and reads the authenticated profile', async () => {
    const login = await request(app)
      .post('/auth/login')
      .send({ login: 'alice', password: 'ChangeMe123!' });

    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));

    const profile = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(profile.status).toBe(200);
    expect(profile.body.profile.username).toBe('alice');
    expect(profile.body.profile.passwordHash).toBeUndefined();
    expect(Object.keys(profile.body.profile).sort()).toEqual(
      ['id', 'username', 'displayName', 'email', 'bio', 'createdAt'].sort(),
    );

    const data = await request(app).get('/api/data')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(data.status).toBe(200);
    expect(data.body.user).toBe('alice');
    expect(data.body.items).toHaveLength(2);
  });

  test('accepts the previous username field for compatibility', async () => {
    const response = await request(app).post('/auth/login')
      .send({ username: 'alice', password: 'ChangeMe123!' });
    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
  });

  test.each([
    { login: 'alice', password: 'wrong-password' },
    { login: 'missing-user', password: 'ChangeMe123!' },
    { login: 'alice\' OR 1=1 --', password: 'wrong-password' },
  ])('rejects incorrect credentials and SQL injection: $login', async (credentials) => {
    const response = await request(app).post('/auth/login').send(credentials);
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid username or password' });
  });

  test.each([{}, { login: 'alice' }, { login: 123, password: 'test' },
    { login: '', password: 'test' }, { login: 'alice', password: '' },
  ])('rejects invalid login input: %j', async (credentials) => {
    const response = await request(app).post('/auth/login').send(credentials);
    expect(response.status).toBe(400);
  });

  test('returns JSON errors for malformed and oversized bodies', async () => {
    const malformed = await request(app).post('/auth/login')
      .set('Content-Type', 'application/json').send('{');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toBe('Malformed JSON');
    const oversized = await request(app).post('/auth/login')
      .send({ username: 'alice', password: 'x'.repeat(33000) });
    expect(oversized.status).toBe(413);
    expect(oversized.body.error).toBe('Request body too large');
  });

  test.each(['/api/data', '/api/profile'])('protects %s from invalid tokens', async (endpoint) => {
    const claims = { sub: 1, username: 'alice' };
    const expired = jwt.sign(claims, process.env.JWT_SECRET, { expiresIn: -1 });
    const forged = jwt.sign(claims, 'different-secret');
    const wrongAlgorithm = jwt.sign(claims, process.env.JWT_SECRET, { algorithm: 'HS384' });
    const invalidClaims = jwt.sign({ sub: 'invalid' }, process.env.JWT_SECRET);
    for (const header of ['', 'Basic abc', 'Bearer garbage', `Bearer ${expired}`,
      `Bearer ${forged}`, `Bearer ${wrongAlgorithm}`, `Bearer ${invalidClaims}`,
      `Bearer ${forged} extra`]) {
      const response = await request(app).get(endpoint).set('Authorization', header);
      expect(response.status).toBe(401);
      expect(response.body.error).toEqual(expect.any(String));
    }
  });

  test('provides health and JSON 404 responses', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });
    const missing = await request(app).get('/missing');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Not found' });
  });
});
