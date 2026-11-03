import fs from 'node:fs/promises';
import path from 'node:path';
import type { Pool, PoolClient } from 'pg';
import type { AppLogger } from '../logging/app-logger.js';

export const DEFAULT_MIGRATIONS_DIR = path.join(
  import.meta.dirname,
  'migrations',
);

const ADVISORY_LOCK_KEY = 727001;

export interface MigrationOptions {
  dir?: string;
  logger?: Pick<AppLogger, 'info'>;
}

const ensureMigrationsTable = (client: PoolClient) =>
  client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

const listMigrationFiles = async (dir: string): Promise<string[]> =>
  (await fs.readdir(dir)).filter((file) => file.endsWith('.sql')).sort();

const applyMigration = async (
  client: PoolClient,
  dir: string,
  file: string,
): Promise<void> => {
  const sql = await fs.readFile(path.join(dir, file), 'utf8');
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [
      file,
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

export const runMigrations = async (
  pool: Pool,
  { dir = DEFAULT_MIGRATIONS_DIR, logger }: MigrationOptions = {},
): Promise<string[]> => {
  const client = await pool.connect();
  const executed: string[] = [];

  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    await ensureMigrationsTable(client);

    const { rows } = await client.query<{ name: string }>(
      'SELECT name FROM schema_migrations',
    );
    const applied = new Set(rows.map((row) => row.name));

    for (const file of await listMigrationFiles(dir)) {
      if (applied.has(file)) {
        continue;
      }
      await applyMigration(client, dir, file);
      executed.push(file);
      logger?.info(`Applied migration ${file}`);
    }
    return executed;
  } finally {
    await client
      .query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY])
      .catch(() => undefined);
    client.release();
  }
};
