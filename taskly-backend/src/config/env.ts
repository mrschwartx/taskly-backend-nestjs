import path from 'node:path';

const MIN_SECRET_LENGTH = 32;

export type Environment = Record<string, string | undefined>;

export interface Config {
  readonly app: {
    readonly name: string;
    readonly host: string;
    readonly port: number;
    readonly level: string;
    readonly isProduction: boolean;
  };
  readonly clientUrl: string;
  readonly database: {
    readonly url: string;
    readonly poolMax: number;
    readonly timeoutMs: number;
  };
  readonly auth: {
    readonly secret: string;
    readonly tokenTtl: string;
    readonly cookieName: string;
    readonly cookieMaxAgeMs: number;
    readonly cookieDomain: string | undefined;
    readonly bcryptRounds: number;
  };
  readonly storage: {
    readonly publicDir: string;
    readonly avatarsDir: string;
    readonly avatarMaxBytes: number;
  };
  readonly logging: {
    readonly level: string;
    readonly toFile: boolean;
    readonly dir: string;
    readonly silent: boolean;
  };
}

const requireValue = (env: Environment, key: string): string => {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const toInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') {
    return fallback;
  }
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
};

export const loadConfig = (env: Environment = process.env): Config => {
  const level = env.APP_LEVEL ?? 'development';
  const isProduction = level === 'production';
  const secret = requireValue(env, 'AUTH_SECRET');

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters long`,
    );
  }

  const publicDir = path.resolve(env.PUBLIC_DIR ?? 'public');

  return Object.freeze({
    app: Object.freeze({
      name: env.APP_NAME ?? 'taskly-api',
      host: env.APP_HOST ?? '0.0.0.0',
      port: toInteger(env.APP_PORT, 8080),
      level,
      isProduction,
    }),
    clientUrl: env.CLIENT_URL ?? 'http://localhost:3000',
    database: Object.freeze({
      url: requireValue(env, 'DATABASE_URL'),
      poolMax: toInteger(env.DATABASE_POOL_MAX, 10),
      timeoutMs: toInteger(env.DATABASE_TIMEOUT, 30000),
    }),
    auth: Object.freeze({
      secret,
      tokenTtl: '1h',
      cookieName: 'taskly_token',
      cookieMaxAgeMs: 60 * 60 * 1000,
      cookieDomain: env.COOKIE_DOMAIN || undefined,
      bcryptRounds: toInteger(env.BCRYPT_ROUNDS, 10),
    }),
    storage: Object.freeze({
      publicDir,
      avatarsDir: path.join(publicDir, 'images', 'users'),
      avatarMaxBytes: 2 * 1024 * 1024,
    }),
    logging: Object.freeze({
      level: env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
      toFile: toBoolean(env.LOG_TO_FILE, true),
      dir: path.resolve(env.LOG_DIR ?? 'logs'),
      silent: toBoolean(env.LOG_SILENT, false),
    }),
  });
};
