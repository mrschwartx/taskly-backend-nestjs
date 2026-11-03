import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MISSING_ID } from '../../support/builders.js';
import { createImageForm } from '../../support/http-client.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../../support/postgres.js';
import {
  registerUser,
  startTestApp,
  type TestApp,
} from '../../support/test-app.js';

describe('auth and users over HTTP', () => {
  let database: TestDatabase;
  let app: TestApp;

  const avatarFiles = (): string[] =>
    fs
      .readdirSync(path.join(app.publicDir, 'images', 'users'))
      .filter((file) => file.startsWith('avatar-'));

  beforeAll(async () => {
    database = await startTestDatabase();
    app = await startTestApp({ databaseUrl: database.url });
  });

  afterAll(async () => {
    await app.stop();
    await database.stop();
  });

  describe('service basics', () => {
    it('greets on the root path', async () => {
      const response = await app.createClient().get('/');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Welcome to the Taskly API' });
    });

    it('responds with 404 for unknown routes', async () => {
      const response = await app.createClient().get('/api/v1/unknown');
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Not found' });
    });

    it('responds with 400 for malformed JSON', async () => {
      const response = await app.createClient().post('/api/v1/auth/signin', {
        headers: { 'content-type': 'application/json' },
        form: '{broken',
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Malformed JSON body');
    });

    it('does not advertise the framework', async () => {
      const response = await app.createClient().get('/');
      expect(response.headers.get('x-powered-by')).toBeNull();
    });

    it('allows the configured client origin with credentials', async () => {
      const response = await fetch(`${app.baseUrl}/api/v1/auth/signin`, {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      });
      expect(response.headers.get('access-control-allow-origin')).toBe(
        'http://localhost:3000',
      );
      expect(response.headers.get('access-control-allow-credentials')).toBe(
        'true',
      );
    });
  });

  describe('POST /api/v1/auth/signup', () => {
    it('creates a user and starts a session', async () => {
      const client = app.createClient();
      const { credentials, response } = await registerUser(client);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(credentials.username);
      expect(response.body.email).toBe(credentials.email);
      expect(response.body.avatar).toBe('/images/users/default-avatar.jpg');
      expect(response.body._id).toMatch(
        /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/,
      );
      expect('password' in response.body).toBe(false);
      expect(client.hasCookie('taskly_token')).toBe(true);
    });

    it('sets an http only cookie', async () => {
      const { response } = await registerUser(app.createClient());
      const cookie = response.setCookie.find((value) =>
        value.startsWith('taskly_token='),
      );
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Max-Age=3600/i);
    });

    it('rejects duplicate emails and usernames with 422', async () => {
      const { credentials } = await registerUser(app.createClient());

      const sameEmail = await registerUser(app.createClient(), {
        email: credentials.email,
      });
      const sameUsername = await registerUser(app.createClient(), {
        username: credentials.username,
      });

      for (const { response } of [sameEmail, sameUsername]) {
        expect(response.status).toBe(422);
        expect(response.body).toEqual({
          status: 422,
          message: 'Email or Username is already registered.',
        });
      }
    });

    it('rejects invalid payloads with 400', async () => {
      const client = app.createClient();
      const payloads = [
        {},
        { username: 'ab', email: 'a@mail.com', password: 'Password123!' },
        { username: 'valid_user', email: 'nope', password: 'Password123!' },
        { username: 'valid_user', email: 'a@mail.com', password: 'short' },
      ];
      for (const json of payloads) {
        const response = await client.post('/api/v1/auth/signup', { json });
        expect(response.status).toBe(400);
      }
    });
  });

  describe('POST /api/v1/auth/signin', () => {
    it('signs in with valid credentials', async () => {
      const { credentials, user } = await registerUser(app.createClient());
      const client = app.createClient();

      const response = await client.post('/api/v1/auth/signin', {
        json: { email: credentials.email, password: credentials.password },
      });

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(user._id);
      expect(client.hasCookie('taskly_token')).toBe(true);
    });

    it('answers 404 for an unknown email', async () => {
      const response = await app.createClient().post('/api/v1/auth/signin', {
        json: { email: 'ghost@mail.com', password: 'Password123!' },
      });
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found!');
    });

    it('answers 401 for a wrong password', async () => {
      const { credentials } = await registerUser(app.createClient());
      const response = await app.createClient().post('/api/v1/auth/signin', {
        json: { email: credentials.email, password: 'definitely-wrong' },
      });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Wrong password!');
    });

    it('rejects operator injection in credentials', async () => {
      await registerUser(app.createClient());
      const client = app.createClient();

      const response = await client.post('/api/v1/auth/signin', {
        json: { email: { $ne: null }, password: 'Password123!' },
      });

      expect(response.status).toBe(400);
      expect(client.hasCookie('taskly_token')).toBe(false);
    });
  });

  describe('GET /api/v1/auth/signout', () => {
    it('clears the session cookie', async () => {
      const client = app.createClient();
      await registerUser(client);
      expect(client.hasCookie('taskly_token')).toBe(true);

      const response = await client.get('/api/v1/auth/signout');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Sign out successful' });
      expect(client.hasCookie('taskly_token')).toBe(false);
      expect((await client.get('/api/v1/users')).status).toBe(401);
    });
  });

  describe('authentication guard', () => {
    it('answers 401 without a cookie', async () => {
      const response = await app.createClient().get('/api/v1/users');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized: Token not provided');
    });

    it('answers 403 for an invalid token', async () => {
      const response = await app.createClient().get('/api/v1/users', {
        headers: { cookie: 'taskly_token=garbage' },
      });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: Invalid token');
    });

    it('protects every users route', async () => {
      const client = app.createClient();
      const requests = [
        client.get(`/api/v1/users/${MISSING_ID}`),
        client.patch(`/api/v1/users/update/${MISSING_ID}`, { json: {} }),
        client.post(`/api/v1/users/upload/${MISSING_ID}`),
        client.delete(`/api/v1/users/delete/${MISSING_ID}`),
      ];
      for (const response of await Promise.all(requests)) {
        expect(response.status).toBe(401);
      }
    });
  });

  describe('GET /api/v1/users', () => {
    it('lists and filters users without exposing passwords', async () => {
      const client = app.createClient();
      const { credentials } = await registerUser(client, {
        username: 'searchable_person',
      });

      const all = await client.get('/api/v1/users');
      const filtered = await client.get(
        '/api/v1/users?username=SEARCHABLE&email=' +
          encodeURIComponent(credentials.email),
      );

      expect(all.status).toBe(200);
      expect(all.body.every((user: object) => !('password' in user))).toBe(
        true,
      );
      expect(filtered.body).toHaveLength(1);
      expect(filtered.body[0].username).toBe('searchable_person');
    });

    it('answers 404 when nothing matches', async () => {
      const client = app.createClient();
      await registerUser(client);
      const response = await client.get(
        '/api/v1/users?username=no_such_user_xyz',
      );
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('No users found');
    });

    it('rejects repeated filter parameters', async () => {
      const client = app.createClient();
      await registerUser(client);
      const response = await client.get('/api/v1/users?username=a&username=b');
      expect(response.status).toBe(400);
    });

    it('does not treat filters as regular expressions', async () => {
      const client = app.createClient();
      await registerUser(client);
      const response = await client.get('/api/v1/users?username=.*');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns the user', async () => {
      const client = app.createClient();
      const { user } = await registerUser(client);
      const response = await client.get(`/api/v1/users/${user._id}`);
      expect(response.status).toBe(200);
      expect(response.body._id).toBe(user._id);
      expect('password' in response.body).toBe(false);
    });

    it('answers 400 for malformed ids and 404 for unknown ids', async () => {
      const client = app.createClient();
      await registerUser(client);

      const malformed = await client.get('/api/v1/users/not-an-id');
      const unknown = await client.get(`/api/v1/users/${MISSING_ID}`);

      expect(malformed.status).toBe(400);
      expect(malformed.body.message).toBe('Invalid user ID format');
      expect(unknown.status).toBe(404);
      expect(unknown.body.message).toBe('User not found!');
    });
  });

  describe('PATCH /api/v1/users/update/:id', () => {
    it('updates the profile and lets the user sign in with the new password', async () => {
      const client = app.createClient();
      const { credentials, user } = await registerUser(client);
      const username = `renamed_${Date.now()}`;

      const response = await client.patch(`/api/v1/users/update/${user._id}`, {
        json: { username, password: 'BrandNewPassword1' },
      });

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(username);
      expect('password' in response.body).toBe(false);

      const fresh = app.createClient();
      const oldLogin = await fresh.post('/api/v1/auth/signin', {
        json: { email: credentials.email, password: credentials.password },
      });
      const newLogin = await fresh.post('/api/v1/auth/signin', {
        json: { email: credentials.email, password: 'BrandNewPassword1' },
      });
      expect(oldLogin.status).toBe(401);
      expect(newLogin.status).toBe(200);
    });

    it('ignores the avatar field sent by clients', async () => {
      const client = app.createClient();
      const { user } = await registerUser(client);

      const response = await client.patch(`/api/v1/users/update/${user._id}`, {
        json: { username: `kept_${Date.now()}`, avatar: 'default-avatar.jpg' },
      });

      expect(response.status).toBe(200);
      expect(response.body.avatar).toBe('/images/users/default-avatar.jpg');
    });

    it('rejects updating another account with 401', async () => {
      const victim = await registerUser(app.createClient());
      const attacker = app.createClient();
      await registerUser(attacker);

      const response = await attacker.patch(
        `/api/v1/users/update/${victim.user._id}`,
        { json: { username: 'hijacked_name' } },
      );

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        'You can only update your own account',
      );
    });

    it('rejects colliding usernames with 422 and empty updates with 400', async () => {
      const first = await registerUser(app.createClient());
      const client = app.createClient();
      const { user } = await registerUser(client);

      const collision = await client.patch(`/api/v1/users/update/${user._id}`, {
        json: { username: first.credentials.username },
      });
      const empty = await client.patch(`/api/v1/users/update/${user._id}`, {
        json: {},
      });

      expect(collision.status).toBe(422);
      expect(empty.status).toBe(400);
    });
  });

  describe('POST /api/v1/users/upload/:id', () => {
    it('stores the avatar, serves it, and replaces the previous one', async () => {
      const client = app.createClient();
      const { user } = await registerUser(client);
      const before = avatarFiles().length;

      const first = await client.post(`/api/v1/users/upload/${user._id}`, {
        form: createImageForm(),
      });

      expect(first.status).toBe(200);
      expect(first.body.avatar).toMatch(
        /^\/images\/users\/avatar-[\w-]+\.png$/,
      );
      expect(avatarFiles()).toHaveLength(before + 1);

      const served = await fetch(`${app.baseUrl}${first.body.avatar}`);
      expect(served.status).toBe(200);
      expect(served.headers.get('content-type')).toBe('image/png');
      expect(served.headers.get('x-content-type-options')).toBe('nosniff');

      const second = await client.post(`/api/v1/users/upload/${user._id}`, {
        form: createImageForm({ type: 'image/jpeg', filename: 'next.jpg' }),
      });

      expect(second.status).toBe(200);
      expect(second.body.avatar).toMatch(/\.jpg$/);
      expect(avatarFiles()).toHaveLength(before + 1);
      expect((await fetch(`${app.baseUrl}${first.body.avatar}`)).status).toBe(
        404,
      );
    });

    it('rejects non image uploads', async () => {
      const client = app.createClient();
      const { user } = await registerUser(client);
      const before = avatarFiles().length;

      const response = await client.post(`/api/v1/users/upload/${user._id}`, {
        form: createImageForm({ type: 'text/html', filename: 'xss.html' }),
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Only JPEG, PNG, WEBP and GIF/);
      expect(avatarFiles()).toHaveLength(before);
    });

    it('rejects files above 2MB and leaves nothing on disk', async () => {
      const client = app.createClient();
      const { user } = await registerUser(client);
      const before = avatarFiles().length;

      const response = await client.post(`/api/v1/users/upload/${user._id}`, {
        form: createImageForm({ size: 2 * 1024 * 1024 + 1 }),
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('File size exceeds 2MB');
      expect(avatarFiles()).toHaveLength(before);
    });

    it('rejects requests without a file', async () => {
      const client = app.createClient();
      const { user } = await registerUser(client);

      const response = await client.post(`/api/v1/users/upload/${user._id}`, {
        form: new FormData(),
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No file uploaded');
    });

    it('rejects uploads for another account before writing anything', async () => {
      const victim = await registerUser(app.createClient());
      const attacker = app.createClient();
      await registerUser(attacker);
      const before = avatarFiles().length;

      const response = await attacker.post(
        `/api/v1/users/upload/${victim.user._id}`,
        { form: createImageForm() },
      );

      expect(response.status).toBe(401);
      expect(avatarFiles()).toHaveLength(before);
    });

    it('ignores a differently named file field', async () => {
      const client = app.createClient();
      const { user } = await registerUser(client);

      const response = await client.post(`/api/v1/users/upload/${user._id}`, {
        form: createImageForm({ fieldName: 'photo' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/users/delete/:id', () => {
    it('deletes the account, ends the session and removes the avatar', async () => {
      const client = app.createClient();
      const { credentials, user } = await registerUser(client);
      await client.post(`/api/v1/users/upload/${user._id}`, {
        form: createImageForm(),
      });
      const before = avatarFiles().length;

      const response = await client.delete(`/api/v1/users/delete/${user._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'User has been deleted' });
      expect(client.hasCookie('taskly_token')).toBe(false);
      expect(avatarFiles()).toHaveLength(before - 1);

      const login = await app.createClient().post('/api/v1/auth/signin', {
        json: { email: credentials.email, password: credentials.password },
      });
      expect(login.status).toBe(404);
    });

    it('rejects deleting another account with 401', async () => {
      const victim = await registerUser(app.createClient());
      const attacker = app.createClient();
      await registerUser(attacker);

      const response = await attacker.delete(
        `/api/v1/users/delete/${victim.user._id}`,
      );

      expect(response.status).toBe(401);
      expect(response.body.message).toBe(
        'You can only delete your own account',
      );
      const stillThere = await app.createClient().post('/api/v1/auth/signin', {
        json: {
          email: victim.credentials.email,
          password: victim.credentials.password,
        },
      });
      expect(stillThere.status).toBe(200);
    });
  });
});
