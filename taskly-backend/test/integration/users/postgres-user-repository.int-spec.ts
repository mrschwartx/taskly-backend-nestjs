import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { User } from '../../../src/modules/users/domain/user.js';
import { Email } from '../../../src/modules/users/domain/value-objects/email.js';
import { Username } from '../../../src/modules/users/domain/value-objects/username.js';
import { PostgresUserRepository } from '../../../src/modules/users/infrastructure/postgres-user-repository.js';
import { AlreadyExistsError } from '../../../src/shared/domain/errors.js';
import { runMigrations } from '../../../src/shared/infrastructure/postgres/migrator.js';
import { PostgresService } from '../../../src/shared/infrastructure/postgres/postgres.service.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../../support/postgres.js';
import { createSilentLogger } from '../../support/silent-logger.js';
import { createTestConfig } from '../../support/test-config.js';

describe('PostgresUserRepository', () => {
  let database: TestDatabase;
  let postgres: PostgresService;
  let repository: PostgresUserRepository;

  let clock = 0;

  const newUser = (username: string, email: string): User =>
    User.register({
      id: repository.nextId(),
      username: Username.create(username),
      email: Email.create(email),
      passwordHash: 'hash',
      now: new Date(Date.UTC(2026, 0, 1, 0, 0, (clock += 1))),
    });

  beforeAll(async () => {
    database = await startTestDatabase();
    postgres = new PostgresService(
      createTestConfig({ DATABASE_URL: database.url, DATABASE_POOL_MAX: '4' }),
      createSilentLogger(),
    );
    await postgres.onModuleInit();
    repository = new PostgresUserRepository(postgres);
  });

  beforeEach(async () => {
    await postgres.pool.query('TRUNCATE users CASCADE');
  });

  afterAll(async () => {
    await postgres.close();
    await database.stop();
  });

  it('generates unique valid UUIDs', () => {
    expect(repository.nextId()).toMatch(
      /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/,
    );
    expect(repository.nextId()).not.toBe(repository.nextId());
  });

  it('persists users in typed columns', async () => {
    const user = newUser('johndoe123', 'johndoe123@mail.com');
    await repository.add(user);

    const { rows } = await postgres.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [user.id],
    );

    expect(rows[0].username).toBe('johndoe123');
    expect(rows[0].email).toBe('johndoe123@mail.com');
    expect(rows[0].password_hash).toBe('hash');
    expect(rows[0].avatar_file).toBe('/images/users/default-avatar.jpg');
    expect(rows[0].created_at).toBeInstanceOf(Date);
    expect(rows[0].updated_at).toBeInstanceOf(Date);
  });

  it('finds users by id and by email', async () => {
    const user = newUser('johndoe123', 'johndoe123@mail.com');
    await repository.add(user);

    const byId = await repository.findById(user.id);
    const byEmail = await repository.findByEmail('johndoe123@mail.com');

    expect(byId?.toSnapshot()).toEqual(user.toSnapshot());
    expect(byEmail?.id).toBe(user.id);
    expect(await repository.findById(repository.nextId())).toBeNull();
    expect(await repository.findByEmail('ghost@mail.com')).toBeNull();
  });

  it('enforces unique emails and usernames', async () => {
    await repository.add(newUser('johndoe123', 'johndoe123@mail.com'));

    await expect(
      repository.add(newUser('someoneelse', 'johndoe123@mail.com')),
    ).rejects.toThrow(AlreadyExistsError);
    await expect(
      repository.add(newUser('johndoe123', 'other@mail.com')),
    ).rejects.toThrow(AlreadyExistsError);
  });

  it('applies migrations idempotently', async () => {
    expect(await runMigrations(postgres.pool)).toEqual([]);

    const { rows } = await postgres.pool.query(
      'SELECT name FROM schema_migrations ORDER BY name',
    );
    expect(rows.map((row) => row.name)).toEqual([
      '0001_create_users.sql',
      '0002_create_tasks.sql',
    ]);
  });

  it('creates unique indexes for email and username', async () => {
    const { rows } = await postgres.pool.query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'users'",
    );
    const names = rows.map((row) => row.indexname);

    expect(names).toContain('users_email_unique');
    expect(names).toContain('users_username_unique');
  });

  it('updates users and reports whether they exist', async () => {
    const user = newUser('johndoe123', 'johndoe123@mail.com');
    await repository.add(user);

    user.changeAvatar('/images/users/avatar-1-2.png');
    expect(await repository.update(user)).toBe(true);
    expect((await repository.findById(user.id))?.avatar).toBe(
      '/images/users/avatar-1-2.png',
    );

    expect(await repository.update(newUser('ghost', 'ghost@mail.com'))).toBe(
      false,
    );
  });

  it('rejects updates that collide with another user', async () => {
    await repository.add(newUser('jane78', 'jane@mail.com'));
    const user = newUser('johndoe123', 'johndoe123@mail.com');
    await repository.add(user);

    user.updateProfile({ email: Email.create('jane@mail.com') });

    await expect(repository.update(user)).rejects.toThrow(AlreadyExistsError);
  });

  it('checks existence by email or username excluding a user', async () => {
    const user = newUser('johndoe123', 'johndoe123@mail.com');
    await repository.add(user);

    expect(
      await repository.existsByEmailOrUsername({
        email: 'johndoe123@mail.com',
      }),
    ).toBe(true);
    expect(
      await repository.existsByEmailOrUsername({ username: 'johndoe123' }),
    ).toBe(true);
    expect(
      await repository.existsByEmailOrUsername({
        email: 'johndoe123@mail.com',
        username: 'johndoe123',
        excludeId: user.id,
      }),
    ).toBe(false);
    expect(
      await repository.existsByEmailOrUsername({ email: 'free@mail.com' }),
    ).toBe(false);
    expect(await repository.existsByEmailOrUsername({})).toBe(false);
  });

  it('searches case-insensitively by substring in creation order', async () => {
    await repository.add(newUser('johndoe123', 'johndoe123@mail.com'));
    await repository.add(newUser('jane78', 'jane@mail.com'));

    const byUsername = await repository.search({ username: 'JOHN' });
    const byEmail = await repository.search({ email: 'JANE@' });
    const all = await repository.search({});

    expect(byUsername.map((user) => user.username.value)).toEqual([
      'johndoe123',
    ]);
    expect(byEmail.map((user) => user.username.value)).toEqual(['jane78']);
    expect(all.map((user) => user.username.value)).toEqual([
      'johndoe123',
      'jane78',
    ]);
  });

  it('finds users by email regardless of letter case', async () => {
    const user = newUser('johndoe123', 'johndoe123@mail.com');
    await repository.add(user);

    const found = await repository.findByEmail('JohnDoe123@Mail.com');

    expect(found?.id).toBe(user.id);
  });

  it('treats email and username as equal regardless of letter case', async () => {
    await repository.add(newUser('johndoe123', 'johndoe123@mail.com'));

    await expect(
      repository.add(newUser('JohnDoe123', 'other@mail.com')),
    ).rejects.toThrow(AlreadyExistsError);
    await expect(
      repository.add(newUser('other', 'JohnDoe123@Mail.com')),
    ).rejects.toThrow(AlreadyExistsError);
    expect(
      await repository.existsByEmailOrUsername({
        email: 'JOHNDOE123@MAIL.COM',
      }),
    ).toBe(true);
    expect(
      await repository.existsByEmailOrUsername({ username: 'JOHNDOE123' }),
    ).toBe(true);
  });

  it('treats pattern characters literally when searching', async () => {
    await repository.add(newUser('johndoe123', 'johndoe123@mail.com'));

    for (const term of ['.*', '(', '%', '_', '\\', 'john%']) {
      expect(
        await repository.search({ username: term }),
        `username ${term}`,
      ).toHaveLength(0);
    }
    expect(await repository.search({ email: '^john' })).toHaveLength(0);
    expect(await repository.search({ username: 'john_oe' })).toHaveLength(0);
  });

  it('deletes users and reports whether they existed', async () => {
    const user = newUser('johndoe123', 'johndoe123@mail.com');
    await repository.add(user);

    expect(await repository.deleteById(user.id)).toBe(true);
    expect(await repository.deleteById(user.id)).toBe(false);
    expect(await repository.findById(user.id)).toBeNull();
  });
});
