import type { NestExpressApplication } from '@nestjs/platform-express';
import { createApplication } from '../../src/bootstrap/create-application.js';
import type { Config, Environment } from '../../src/config/env.js';
import { createHttpClient, type HttpClient } from './http-client.js';
import {
  createTempPublicDir,
  createTestConfig,
  removeDir,
} from './test-config.js';

export interface TestApp {
  app: NestExpressApplication;
  config: Config;
  publicDir: string;
  baseUrl: string;
  createClient: () => HttpClient;
  stop: () => Promise<void>;
}

export interface StartTestAppOptions {
  databaseUrl: string;
  overrides?: Environment;
}

export const startTestApp = async ({
  databaseUrl,
  overrides = {},
}: StartTestAppOptions): Promise<TestApp> => {
  const publicDir = createTempPublicDir();
  const config = createTestConfig({
    DATABASE_URL: databaseUrl,
    PUBLIC_DIR: publicDir,
    ...overrides,
  });
  const app = await createApplication(config);
  await app.listen(0, '127.0.0.1');
  const { port } = app.getHttpServer().address() as { port: number };
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    app,
    config,
    publicDir,
    baseUrl,
    createClient: () => createHttpClient(baseUrl),
    stop: async () => {
      app.getHttpServer().closeIdleConnections();
      await app.close();
      removeDir(publicDir);
    },
  };
};

export interface Credentials {
  username: string;
  email: string;
  password: string;
}

export const registerUser = async (
  client: HttpClient,
  overrides: Partial<Credentials> = {},
) => {
  const credentials: Credentials = {
    username: `user_${Math.random().toString(36).slice(2, 10)}`,
    email: `${Math.random().toString(36).slice(2, 10)}@mail.com`,
    password: 'Password123!',
    ...overrides,
  };
  const response = await client.post('/api/v1/auth/signup', {
    json: credentials,
  });
  return { credentials, response, user: response.body };
};

export const taskPayload = (overrides: Record<string, unknown> = {}) => ({
  name: 'Read Atomic Habits',
  description: 'Finish reading Atomic Habits by James Clear',
  priority: 'low',
  due: '2026-12-08T10:00:00Z',
  status: 'todo',
  ...overrides,
});
