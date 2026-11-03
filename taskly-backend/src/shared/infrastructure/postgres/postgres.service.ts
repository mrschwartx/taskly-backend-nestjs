import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import pg from 'pg';
import { APP_CONFIG } from '../../../config/config.constants.js';
import type { Config } from '../../../config/env.js';
import { AppLogger } from '../logging/app-logger.js';
import { runMigrations } from './migrator.js';

@Injectable()
export class PostgresService implements OnModuleInit, OnApplicationShutdown {
  readonly pool: pg.Pool;
  private closed = false;

  constructor(
    @Inject(APP_CONFIG) config: Config,
    private readonly logger: AppLogger,
  ) {
    this.pool = new pg.Pool({
      connectionString: config.database.url,
      max: config.database.poolMax,
      connectionTimeoutMillis: config.database.timeoutMs,
    });
    this.pool.on('error', (error) => {
      this.logger.error('Idle PostgreSQL client error', {
        message: error.message,
      });
    });
  }

  async onModuleInit(): Promise<void> {
    await this.pool.query('SELECT 1');
    await runMigrations(this.pool, { logger: this.logger });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    await this.pool.end();
  }
}
