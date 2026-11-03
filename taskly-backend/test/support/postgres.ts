import pg from 'pg';
import { randomDatabaseName } from './test-config.js';

export const DEFAULT_TEST_DATABASE_URL =
  'postgres://dev_user:dev_pass@localhost:5432/taskly_dev';

export interface TestDatabase {
  name: string;
  url: string;
  stop: () => Promise<void>;
}

const quoteIdentifier = (name: string): string =>
  `"${name.replaceAll('"', '""')}"`;

const withAdminClient = async <T>(
  adminUrl: string,
  callback: (client: pg.Client) => Promise<T>,
): Promise<T> => {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
};

export const startTestDatabase = async (): Promise<TestDatabase> => {
  const adminUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const name = randomDatabaseName();

  await withAdminClient(adminUrl, (client) =>
    client.query(`CREATE DATABASE ${quoteIdentifier(name)}`),
  );

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;

  return {
    name,
    url: url.toString(),
    stop: async () => {
      await withAdminClient(adminUrl, (client) =>
        client.query(
          `DROP DATABASE IF EXISTS ${quoteIdentifier(name)} WITH (FORCE)`,
        ),
      );
    },
  };
};
