import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createImageForm } from '../support/http-client.js';
import { startTestDatabase, type TestDatabase } from '../support/postgres.js';
import { startServerProcess } from '../support/server-process.js';
import { taskPayload } from '../support/test-app.js';

describe('e2e: a full user journey against the real server process', () => {
  let database: TestDatabase;
  let server: Awaited<ReturnType<typeof startServerProcess>>;

  beforeAll(async () => {
    database = await startTestDatabase();
    server = await startServerProcess({ databaseUrl: database.url });
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
    await database.stop();
  });

  it('lets a person sign up, manage tasks, change profile and leave', async () => {
    const client = server.createClient();

    const signUp = await client.post('/api/v1/auth/signup', {
      json: {
        username: 'johndoe1',
        email: 'johndoe1@mail.com',
        password: 'P@ssword123',
      },
    });
    expect(signUp.status).toBe(200);
    const userId = signUp.body._id;

    const names = ['Read', 'Write', 'Review', 'Ship', 'Rest'];
    const createdIds: string[] = [];
    for (const name of names) {
      const created = await client.post('/api/v1/tasks/create', {
        json: taskPayload({ name }),
      });
      expect(created.status).toBe(200);
      createdIds.push(created.body._id);
    }

    const firstPage = await client.get(`/api/v1/tasks/user/${userId}`);
    const secondPage = await client.get(`/api/v1/tasks/user/${userId}?page=2`);
    expect(firstPage.body.taskCount).toBe(5);
    expect(firstPage.body.tasks).toHaveLength(4);
    expect(secondPage.body.tasks).toHaveLength(1);

    const updated = await client.patch(`/api/v1/tasks/${createdIds[0]}`, {
      json: { status: 'in_progress', priority: 'high' },
    });
    expect(updated.body.status).toBe('in_progress');

    const inProgress = await client.get(
      `/api/v1/tasks/user/${userId}?status=in_progress`,
    );
    expect(inProgress.body.taskCount).toBe(1);

    const removed = await client.delete(`/api/v1/tasks/${createdIds[1]}`);
    expect(removed.status).toBe(200);

    const upload = await client.post(`/api/v1/users/upload/${userId}`, {
      form: createImageForm(),
    });
    expect(upload.status).toBe(200);
    const image = await fetch(`${server.baseUrl}${upload.body.avatar}`);
    expect(image.status).toBe(200);

    const profile = await client.patch(`/api/v1/users/update/${userId}`, {
      json: { username: 'johndoe_renamed' },
    });
    expect(profile.body.username).toBe('johndoe_renamed');
    expect(profile.body.avatar).toBe(upload.body.avatar);

    const signOut = await client.get('/api/v1/auth/signout');
    expect(signOut.status).toBe(200);
    expect((await client.get(`/api/v1/tasks/${createdIds[0]}`)).status).toBe(
      401,
    );

    const signIn = await client.post('/api/v1/auth/signin', {
      json: { email: 'johndoe1@mail.com', password: 'P@ssword123' },
    });
    expect(signIn.status).toBe(200);
    expect(signIn.body.username).toBe('johndoe_renamed');

    const leave = await client.delete(`/api/v1/users/delete/${userId}`);
    expect(leave.status).toBe(200);
    expect((await fetch(`${server.baseUrl}${upload.body.avatar}`)).status).toBe(
      404,
    );

    const again = await client.post('/api/v1/auth/signin', {
      json: { email: 'johndoe1@mail.com', password: 'P@ssword123' },
    });
    expect(again.status).toBe(404);
  });

  it('keeps two users completely isolated from each other', async () => {
    const alice = server.createClient();
    const bob = server.createClient();
    const aliceUser = (
      await alice.post('/api/v1/auth/signup', {
        json: {
          username: 'alice_e2e',
          email: 'alice@mail.com',
          password: 'AlicePass123',
        },
      })
    ).body;
    const bobUser = (
      await bob.post('/api/v1/auth/signup', {
        json: {
          username: 'bob_e2e',
          email: 'bob@mail.com',
          password: 'BobbyPass123',
        },
      })
    ).body;

    const aliceTask = (
      await alice.post('/api/v1/tasks/create', { json: taskPayload() })
    ).body;

    expect((await bob.get(`/api/v1/tasks/${aliceTask._id}`)).status).toBe(403);
    expect((await bob.get(`/api/v1/tasks/user/${aliceUser._id}`)).status).toBe(
      403,
    );
    expect(
      (
        await bob.patch(`/api/v1/tasks/${aliceTask._id}`, {
          json: { name: 'bob was here' },
        })
      ).status,
    ).toBe(403);
    expect((await bob.delete(`/api/v1/tasks/${aliceTask._id}`)).status).toBe(
      403,
    );
    expect(
      (
        await bob.patch(`/api/v1/users/update/${aliceUser._id}`, {
          json: { username: 'stolen' },
        })
      ).status,
    ).toBe(401);
    expect(
      (await bob.delete(`/api/v1/users/delete/${aliceUser._id}`)).status,
    ).toBe(401);

    const untouched = await alice.get(`/api/v1/tasks/${aliceTask._id}`);
    expect(untouched.body.name).toBe(aliceTask.name);
    expect(
      (await bob.get(`/api/v1/tasks/user/${bobUser._id}`)).body.taskCount,
    ).toBe(0);
  });

  it('serves the default avatar and the welcome message', async () => {
    const client = server.createClient();
    const welcome = await client.get('/');
    const avatar = await fetch(
      `${server.baseUrl}/images/users/default-avatar.jpg`,
    );

    expect(welcome.body).toEqual({ message: 'Welcome to the Taskly API' });
    expect(avatar.status).toBe(200);
    expect(avatar.headers.get('content-type')).toBe('image/jpeg');
  });

  it('shuts down gracefully on SIGTERM', async () => {
    const instance = await startServerProcess({ databaseUrl: database.url });
    const client = instance.createClient();
    expect((await client.get('/')).status).toBe(200);

    const result = await instance.stop('SIGTERM');

    expect(result.code).toBe(0);
    await expect(fetch(`${instance.baseUrl}/`)).rejects.toThrow();
  });
});
