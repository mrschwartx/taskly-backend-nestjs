import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestDatabase, type TestDatabase } from '../support/postgres.js';
import {
  findFreePort,
  runNodeScript,
  startServerProcess,
} from '../support/server-process.js';
import { buildTestEnv } from '../support/test-config.js';

describe('e2e: operating the service', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await startTestDatabase();
  });

  afterAll(async () => {
    await database.stop();
  });

  it('refuses to start without a valid AUTH_SECRET', async () => {
    const env = buildTestEnv({
      DATABASE_URL: database.url,
      APP_PORT: String(await findFreePort()),
      AUTH_SECRET: 'too-short',
    });

    const result = await runNodeScript('dist/main.js', env);

    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/AUTH_SECRET must be at least 32 characters/);
  });

  it('refuses to start without DATABASE_URL', async () => {
    const env = {
      ...buildTestEnv({ APP_PORT: String(await findFreePort()) }),
      DATABASE_URL: '',
    };

    const result = await runNodeScript('dist/main.js', env);

    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/DATABASE_URL/);
  });

  it('exits with an error when PostgreSQL is unreachable', async () => {
    const env = buildTestEnv({
      DATABASE_URL: 'postgres://taskly:taskly@127.0.0.1:1/taskly',
      DATABASE_TIMEOUT: '500',
      APP_PORT: String(await findFreePort()),
    });

    const result = await runNodeScript('dist/main.js', env);

    expect(result.code).toBe(1);
  });

  it('exits with an error when the port is already taken', async () => {
    const running = await startServerProcess({ databaseUrl: database.url });
    try {
      const env = buildTestEnv({
        DATABASE_URL: database.url,
        APP_PORT: String(running.port),
      });

      const result = await runNodeScript('dist/main.js', env);

      expect(result.code).toBe(1);
    } finally {
      await running.stop();
    }
  });

  describe('migrations', () => {
    it('applies migrations through the migrate script', async () => {
      const fresh = await startTestDatabase();
      try {
        const env = buildTestEnv({ DATABASE_URL: fresh.url });

        const first = await runNodeScript('dist/scripts/migrate.js', env);
        const second = await runNodeScript('dist/scripts/migrate.js', env);

        expect(first.code).toBe(0);
        expect(second.code).toBe(0);
      } finally {
        await fresh.stop();
      }
    });
  });

  describe('seeding', () => {
    it('seeds demo users idempotently so they can sign in', async () => {
      const server = await startServerProcess({ databaseUrl: database.url });
      try {
        const first = await runNodeScript('dist/scripts/seed.js', server.env);
        const second = await runNodeScript('dist/scripts/seed.js', server.env);

        expect(first.code).toBe(0);
        expect(second.code).toBe(0);

        const client = server.createClient();
        const signIn = await client.post('/api/v1/auth/signin', {
          json: { email: 'johndoe123@mail.com', password: 'password123' },
        });
        expect(signIn.status).toBe(200);

        const tasks = await client.get(`/api/v1/tasks/user/${signIn.body._id}`);
        expect(tasks.body.taskCount).toBe(1);
        expect(tasks.body.tasks[0].name).toBe('Read Atomic Habits');

        const jane = await server.createClient().post('/api/v1/auth/signin', {
          json: { email: 'jane@mail.com', password: 'securepassword456' },
        });
        expect(jane.status).toBe(200);
      } finally {
        await server.stop();
      }
    });

    it('refuses to seed a production database', async () => {
      const env = buildTestEnv({
        DATABASE_URL: database.url,
        APP_LEVEL: 'production',
      });

      const result = await runNodeScript('dist/scripts/seed.js', env);

      expect(result.code).toBe(1);
    });
  });
});
