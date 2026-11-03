import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadConfig,
  type Config,
  type Environment,
} from '../../src/config/env.js';

export const TEST_AUTH_SECRET = 'test-secret-value-with-more-than-32-chars';

const DEFAULT_AVATAR = path.resolve(
  import.meta.dirname,
  '../../public/images/users/default-avatar.jpg',
);

export const randomDatabaseName = (): string =>
  `taskly_test_${randomBytes(5).toString('hex')}`;

export const createTempPublicDir = (): string => {
  const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'taskly-public-'));
  const avatarsDir = path.join(publicDir, 'images', 'users');
  fs.mkdirSync(avatarsDir, { recursive: true });
  fs.copyFileSync(DEFAULT_AVATAR, path.join(avatarsDir, 'default-avatar.jpg'));
  return publicDir;
};

export const removeDir = (dir: string): void =>
  fs.rmSync(dir, { recursive: true, force: true });

export const buildTestEnv = (overrides: Environment = {}): Environment => ({
  AUTH_SECRET: TEST_AUTH_SECRET,
  DATABASE_URL: 'postgres://127.0.0.1:5432/taskly',
  APP_HOST: '127.0.0.1',
  APP_PORT: '0',
  BCRYPT_ROUNDS: '4',
  LOG_SILENT: 'true',
  LOG_TO_FILE: 'false',
  ...overrides,
});

export const createTestConfig = (overrides: Environment = {}): Config =>
  loadConfig(buildTestEnv(overrides));
