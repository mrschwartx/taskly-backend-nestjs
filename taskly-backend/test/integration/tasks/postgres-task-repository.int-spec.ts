import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Task } from '../../../src/modules/tasks/domain/task.js';
import { DueDate } from '../../../src/modules/tasks/domain/value-objects/due-date.js';
import { TaskName } from '../../../src/modules/tasks/domain/value-objects/task-name.js';
import { TaskStatus } from '../../../src/modules/tasks/domain/value-objects/task-status.js';
import { PostgresTaskRepository } from '../../../src/modules/tasks/infrastructure/postgres-task-repository.js';
import { generateEntityId } from '../../../src/shared/domain/entity-id.js';
import { runMigrations } from '../../../src/shared/infrastructure/postgres/migrator.js';
import { PostgresService } from '../../../src/shared/infrastructure/postgres/postgres.service.js';
import { buildTask, type TaskOverrides } from '../../support/builders.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../../support/postgres.js';
import { createSilentLogger } from '../../support/silent-logger.js';
import { createTestConfig } from '../../support/test-config.js';

describe('PostgresTaskRepository', () => {
  let database: TestDatabase;
  let postgres: PostgresService;
  let repository: PostgresTaskRepository;

  const ownerA = generateEntityId();
  const ownerB = generateEntityId();

  let clock = 0;

  const newTask = (overrides: TaskOverrides = {}): Task =>
    buildTask({
      id: repository.nextId(),
      ownerId: ownerA,
      now: new Date(Date.UTC(2026, 0, 1, 0, 0, (clock += 1))),
      ...overrides,
    });

  beforeAll(async () => {
    database = await startTestDatabase();
    postgres = new PostgresService(
      createTestConfig({ DATABASE_URL: database.url, DATABASE_POOL_MAX: '4' }),
      createSilentLogger(),
    );
    await postgres.onModuleInit();
    repository = new PostgresTaskRepository(postgres);
  });

  beforeEach(async () => {
    await postgres.pool.query('TRUNCATE users CASCADE');
    await postgres.pool.query(
      `INSERT INTO users (id, username, email, password_hash)
       VALUES ($1, 'owner_a', 'owner_a@mail.com', 'hash'),
              ($2, 'owner_b', 'owner_b@mail.com', 'hash')`,
      [ownerA, ownerB],
    );
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

  it('persists tasks in typed columns', async () => {
    const task = newTask();
    await repository.add(task);

    const { rows } = await postgres.pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [task.id],
    );

    expect(rows[0].owner_id).toBe(ownerA);
    expect(rows[0].name).toBe('Read Atomic Habits');
    expect(rows[0].status).toBe('todo');
    expect(rows[0].due).toBeInstanceOf(Date);
    expect(rows[0].created_at).toBeInstanceOf(Date);
  });

  it('finds tasks by id', async () => {
    const task = newTask();
    await repository.add(task);

    const found = await repository.findById(task.id);

    expect(found?.toSnapshot()).toEqual(task.toSnapshot());
    expect(await repository.findById(repository.nextId())).toBeNull();
  });

  it('updates tasks and reports whether they exist', async () => {
    const task = newTask();
    await repository.add(task);

    task.update({ name: TaskName.create('Renamed') });
    expect(await repository.update(task)).toBe(true);
    expect((await repository.findById(task.id))?.name.value).toBe('Renamed');

    expect(await repository.update(newTask())).toBe(false);
  });

  it('lists only the tasks of the given owner with a total', async () => {
    await repository.add(newTask());
    await repository.add(newTask());
    await repository.add(newTask({ ownerId: ownerB }));

    const result = await repository.findByOwner({
      ownerId: ownerA,
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(2);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks.every((task) => task.ownerId === ownerA)).toBe(true);
  });

  it('returns tasks in creation order by default', async () => {
    const created: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const task = newTask();
      created.push(task.id);
      await repository.add(task);
    }

    const result = await repository.findByOwner({
      ownerId: ownerA,
      page: 1,
      pageSize: 10,
    });

    expect(result.tasks.map((task) => task.id)).toEqual(created);
  });

  it('paginates with stable ordering', async () => {
    for (let index = 0; index < 5; index += 1) {
      await repository.add(newTask());
    }

    const query = { ownerId: ownerA, pageSize: 2 };
    const first = await repository.findByOwner({ ...query, page: 1 });
    const second = await repository.findByOwner({ ...query, page: 2 });
    const third = await repository.findByOwner({ ...query, page: 3 });
    const beyond = await repository.findByOwner({ ...query, page: 4 });

    const ids = [...first.tasks, ...second.tasks, ...third.tasks].map(
      (task) => task.id,
    );
    expect(first.total).toBe(5);
    expect(third.tasks).toHaveLength(1);
    expect(new Set(ids).size).toBe(5);
    expect(beyond.tasks).toHaveLength(0);
    expect(beyond.total).toBe(5);
  });

  it('filters by status', async () => {
    await repository.add(newTask());
    await repository.add(newTask({ status: TaskStatus.create('done') }));

    const result = await repository.findByOwner({
      ownerId: ownerA,
      status: 'done',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect(result.tasks[0].status.value).toBe('done');
  });

  it('sorts ascending by the requested field', async () => {
    await repository.add(newTask({ name: TaskName.create('charlie') }));
    await repository.add(newTask({ name: TaskName.create('alpha') }));
    await repository.add(newTask({ name: TaskName.create('bravo') }));

    const result = await repository.findByOwner({
      ownerId: ownerA,
      orderBy: 'name',
      page: 1,
      pageSize: 10,
    });

    expect(result.tasks.map((task) => task.name.value)).toEqual([
      'alpha',
      'bravo',
      'charlie',
    ]);
  });

  it('sorts by due date chronologically', async () => {
    await repository.add(newTask({ due: DueDate.create('2026-03-01') }));
    await repository.add(newTask({ due: DueDate.create('2026-01-01') }));
    await repository.add(
      newTask({ due: DueDate.create('2026-02-01T00:00:00+07:00') }),
    );

    const result = await repository.findByOwner({
      ownerId: ownerA,
      orderBy: 'due',
      page: 1,
      pageSize: 10,
    });

    expect(result.tasks.map((task) => task.due.value)).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-01-31T17:00:00.000Z',
      '2026-03-01T00:00:00.000Z',
    ]);
  });

  it('sorts by camelCase fields mapped to columns', async () => {
    const first = newTask();
    await repository.add(first);
    const second = newTask();
    await repository.add(second);

    const result = await repository.findByOwner({
      ownerId: ownerA,
      orderBy: 'createdAt',
      page: 1,
      pageSize: 10,
    });

    expect(result.tasks.map((task) => task.id)).toEqual([first.id, second.id]);
  });

  it('ignores unknown sort fields instead of building unsafe SQL', async () => {
    await repository.add(newTask());

    const result = await repository.findByOwner({
      ownerId: ownerA,
      orderBy: 'name; DROP TABLE tasks',
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(1);
    expect((await postgres.pool.query('SELECT 1 FROM tasks')).rowCount).toBe(1);
  });

  it('deletes single tasks', async () => {
    const task = newTask();
    await repository.add(task);

    expect(await repository.deleteById(task.id)).toBe(true);
    expect(await repository.deleteById(task.id)).toBe(false);
  });

  it('deletes all tasks of an owner only', async () => {
    await repository.add(newTask());
    await repository.add(newTask());
    await repository.add(newTask({ ownerId: ownerB }));

    expect(await repository.deleteByOwner(ownerA)).toBe(2);

    const remaining = await repository.findByOwner({
      ownerId: ownerB,
      page: 1,
      pageSize: 10,
    });
    expect(remaining.total).toBe(1);
  });

  it('keeps migrations idempotent', async () => {
    expect(await runMigrations(postgres.pool)).toEqual([]);
  });
});
