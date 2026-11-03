import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../../src/config/env.js';
import { buildTestEnv, TEST_AUTH_SECRET } from '../../support/test-config.js';

describe('loadConfig', () => {
  it('applies defaults for optional variables', () => {
    const config = loadConfig({
      AUTH_SECRET: TEST_AUTH_SECRET,
      DATABASE_URL: 'postgres://localhost:5432/taskly',
    });

    expect(config.app.name).toBe('taskly-api');
    expect(config.app.host).toBe('0.0.0.0');
    expect(config.app.port).toBe(8080);
    expect(config.app.isProduction).toBe(false);
    expect(config.database.poolMax).toBe(10);
    expect(config.database.timeoutMs).toBe(30000);
    expect(config.clientUrl).toBe('http://localhost:3000');
    expect(config.auth.bcryptRounds).toBe(10);
    expect(config.auth.cookieName).toBe('taskly_token');
    expect(config.logging.level).toBe('debug');
    expect(config.logging.toFile).toBe(true);
  });

  it('reads overrides and parses numbers and booleans', () => {
    const config = loadConfig(
      buildTestEnv({
        APP_PORT: '9001',
        APP_LEVEL: 'production',
        DATABASE_TIMEOUT: '1500',
        DATABASE_POOL_MAX: '5',
        BCRYPT_ROUNDS: '12',
        LOG_TO_FILE: 'yes',
        COOKIE_DOMAIN: '.example.com',
      }),
    );

    expect(config.app.port).toBe(9001);
    expect(config.app.isProduction).toBe(true);
    expect(config.database.timeoutMs).toBe(1500);
    expect(config.database.poolMax).toBe(5);
    expect(config.auth.bcryptRounds).toBe(12);
    expect(config.auth.cookieDomain).toBe('.example.com');
    expect(config.logging.toFile).toBe(true);
    expect(config.logging.level).toBe('info');
  });

  it('falls back to defaults for invalid numbers', () => {
    const config = loadConfig(buildTestEnv({ APP_PORT: 'abc' }));
    expect(config.app.port).toBe(8080);
  });

  it('treats an empty cookie domain as unset', () => {
    const config = loadConfig(buildTestEnv({ COOKIE_DOMAIN: '' }));
    expect(config.auth.cookieDomain).toBeUndefined();
  });

  it('derives the avatars directory from the public directory', () => {
    const config = loadConfig(
      buildTestEnv({ PUBLIC_DIR: '/tmp/taskly-public' }),
    );
    expect(config.storage.publicDir).toBe('/tmp/taskly-public');
    expect(config.storage.avatarsDir).toBe('/tmp/taskly-public/images/users');
    expect(config.storage.avatarMaxBytes).toBe(2 * 1024 * 1024);
  });

  it('throws when AUTH_SECRET is missing', () => {
    expect(() =>
      loadConfig({ DATABASE_URL: 'postgres://localhost/taskly' }),
    ).toThrow(/AUTH_SECRET/);
  });

  it('throws when AUTH_SECRET is too short', () => {
    expect(() => loadConfig(buildTestEnv({ AUTH_SECRET: 'short' }))).toThrow(
      /at least 32 characters/,
    );
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => loadConfig({ AUTH_SECRET: TEST_AUTH_SECRET })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('returns an immutable object', () => {
    const config = loadConfig(buildTestEnv());
    expect(() => {
      (config as { clientUrl: string }).clientUrl = 'http://evil.test';
    }).toThrow(TypeError);
  });
});
