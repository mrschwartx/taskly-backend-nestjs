import 'dotenv/config';
import { loadConfig } from '../config/env.js';
import { AppLogger } from '../shared/infrastructure/logging/app-logger.js';
import { runMigrations } from '../shared/infrastructure/postgres/migrator.js';
import pg from 'pg';

const migrate = async (): Promise<void> => {
  const config = loadConfig();
  const logger = new AppLogger(config);
  const pool = new pg.Pool({
    connectionString: config.database.url,
    max: config.database.poolMax,
    connectionTimeoutMillis: config.database.timeoutMs,
  });

  try {
    await pool.query('SELECT 1');
    const executed = await runMigrations(pool, { logger });
    logger.info(`Migrations completed, ${executed.length} applied`);
  } finally {
    await pool.end();
    logger.close();
  }
};

try {
  await migrate();
} catch (error) {
  console.error(`Migration failed: ${(error as Error).message}`);
  process.exitCode = 1;
}
