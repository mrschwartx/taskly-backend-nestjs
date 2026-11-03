import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ListTasksByUser } from '../../../src/modules/tasks/application/use-cases/list-tasks-by-user.js';
import { MISSING_ID } from '../../support/builders.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../../support/postgres.js';
import {
  registerUser,
  startTestApp,
  taskPayload,
  type TestApp,
} from '../../support/test-app.js';

describe('tasks over HTTP', () => {
  let database: TestDatabase;
  let app: TestApp;

  const signedInClient = async () => {
    const client = app.createClient();
    const { user } = await registerUser(client);
    return { client, user };
  };

  beforeAll(async () => {
    database = await startTestDatabase();
    app = await startTestApp({ databaseUrl: database.url });
  });

  afterAll(async () => {
    await app.stop();
    await database.stop();
  });

  it('requires authentication on every route', async () => {
    const client = app.createClient();
    const responses = await Promise.all([
      client.get(`/api/v1/tasks/${MISSING_ID}`),
      client.get(`/api/v1/tasks/user/${MISSING_ID}`),
      client.post('/api/v1/tasks/create', { json: taskPayload() }),
      client.patch(`/api/v1/tasks/${MISSING_ID}`, { json: {} }),
      client.delete(`/api/v1/tasks/${MISSING_ID}`),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(401);
    }
  });

  describe('POST /api/v1/tasks/create', () => {
    it('creates a task owned by the authenticated user', async () => {
      const { client, user } = await signedInClient();

      const response = await client.post('/api/v1/tasks/create', {
        json: taskPayload(),
      });

      expect(response.status).toBe(200);
      expect(response.body._id).toMatch(
        /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/,
      );
      expect(response.body.owner).toBe(user._id);
      expect(response.body.name).toBe('Read Atomic Habits');
      expect(response.body.priority).toBe('low');
      expect(response.body.status).toBe('todo');
      expect(response.body.due).toBe('2026-12-08T10:00:00.000Z');
      expect(response.body.createdAt).toBe(response.body.updatedAt);
    });

    it('defaults the status and ignores a spoofed owner', async () => {
      const { client, user } = await signedInClient();
      const other = await signedInClient();
      const { status, ...withoutStatus } = taskPayload();

      const response = await client.post('/api/v1/tasks/create', {
        json: { ...withoutStatus, owner: other.user._id },
      });

      expect(response.status).toBe(200);
      expect(status).toBe('todo');
      expect(response.body.status).toBe('todo');
      expect(response.body.owner).toBe(user._id);
    });

    it('rejects invalid payloads', async () => {
      const { client } = await signedInClient();
      const payloads = [
        {},
        taskPayload({ name: '' }),
        taskPayload({ due: 'someday' }),
        taskPayload({ priority: undefined }),
      ];
      for (const json of payloads) {
        const response = await client.post('/api/v1/tasks/create', { json });
        expect(response.status).toBe(400);
      }
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('returns the task to its owner', async () => {
      const { client } = await signedInClient();
      const created = await client.post('/api/v1/tasks/create', {
        json: taskPayload(),
      });

      const response = await client.get(`/api/v1/tasks/${created.body._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(created.body);
    });

    it('answers 403 for tasks of other users', async () => {
      const owner = await signedInClient();
      const intruder = await signedInClient();
      const created = await owner.client.post('/api/v1/tasks/create', {
        json: taskPayload(),
      });

      const response = await intruder.client.get(
        `/api/v1/tasks/${created.body._id}`,
      );

      expect(response.status).toBe(403);
    });

    it('answers 404 for unknown ids and 400 for malformed ids', async () => {
      const { client } = await signedInClient();

      const unknown = await client.get(`/api/v1/tasks/${MISSING_ID}`);
      const malformed = await client.get('/api/v1/tasks/nope');

      expect(unknown.status).toBe(404);
      expect(unknown.body.message).toBe('Task not found!');
      expect(malformed.status).toBe(400);
    });
  });

  describe('GET /api/v1/tasks/user/:id', () => {
    it('paginates four tasks per page and reports the total', async () => {
      const { client, user } = await signedInClient();
      for (let index = 1; index <= 6; index += 1) {
        await client.post('/api/v1/tasks/create', {
          json: taskPayload({ name: `Task ${index}` }),
        });
      }

      const first = await client.get(`/api/v1/tasks/user/${user._id}`);
      const second = await client.get(`/api/v1/tasks/user/${user._id}?page=2`);

      expect(first.status).toBe(200);
      expect(first.body.taskCount).toBe(6);
      expect(first.body.tasks).toHaveLength(4);
      expect(second.body.tasks).toHaveLength(2);
      expect(
        [...first.body.tasks, ...second.body.tasks].map(
          (task: { name: string }) => task.name,
        ),
      ).toEqual(['Task 1', 'Task 2', 'Task 3', 'Task 4', 'Task 5', 'Task 6']);
    });

    it('filters by status and orders by a field', async () => {
      const { client, user } = await signedInClient();
      await client.post('/api/v1/tasks/create', {
        json: taskPayload({ name: 'b-task', status: 'done' }),
      });
      await client.post('/api/v1/tasks/create', {
        json: taskPayload({ name: 'a-task', status: 'done' }),
      });
      await client.post('/api/v1/tasks/create', {
        json: taskPayload({ name: 'c-task', status: 'todo' }),
      });

      const response = await client.get(
        `/api/v1/tasks/user/${user._id}?status=done&orderBy=name`,
      );

      expect(response.body.taskCount).toBe(2);
      expect(
        response.body.tasks.map((task: { name: string }) => task.name),
      ).toEqual(['a-task', 'b-task']);
    });

    it('returns an empty page for a user without tasks', async () => {
      const { client, user } = await signedInClient();
      const response = await client.get(`/api/v1/tasks/user/${user._id}`);
      expect(response.body).toEqual({ tasks: [], taskCount: 0 });
    });

    it('forbids reading the tasks of another user', async () => {
      const owner = await signedInClient();
      const intruder = await signedInClient();

      const response = await intruder.client.get(
        `/api/v1/tasks/user/${owner.user._id}`,
      );

      expect(response.status).toBe(403);
    });

    it('rejects invalid query parameters', async () => {
      const { client, user } = await signedInClient();

      const badOrder = await client.get(
        `/api/v1/tasks/user/${user._id}?orderBy=owner`,
      );
      const repeatedStatus = await client.get(
        `/api/v1/tasks/user/${user._id}?status=a&status=b`,
      );
      const badId = await client.get('/api/v1/tasks/user/not-an-id');

      expect(badOrder.status).toBe(400);
      expect(repeatedStatus.status).toBe(400);
      expect(badId.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates the task', async () => {
      const { client } = await signedInClient();
      const created = await client.post('/api/v1/tasks/create', {
        json: taskPayload(),
      });

      const response = await client.patch(`/api/v1/tasks/${created.body._id}`, {
        json: {
          name: 'Read Atomic Habits - Updated',
          priority: 'high',
          status: 'in_progress',
          due: '2026-12-15T10:00:00Z',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Read Atomic Habits - Updated');
      expect(response.body.status).toBe('in_progress');
      expect(response.body.owner).toBe(created.body.owner);
      expect(response.body.createdAt).toBe(created.body.createdAt);
      expect(response.body.updatedAt >= created.body.updatedAt).toBe(true);
    });

    it('cannot transfer a task to another user', async () => {
      const owner = await signedInClient();
      const other = await signedInClient();
      const created = await owner.client.post('/api/v1/tasks/create', {
        json: taskPayload(),
      });

      const response = await owner.client.patch(
        `/api/v1/tasks/${created.body._id}`,
        {
          json: { name: 'Still mine', owner: other.user._id },
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.owner).toBe(owner.user._id);
    });

    it('answers 403 for tasks of other users and leaves them untouched', async () => {
      const owner = await signedInClient();
      const intruder = await signedInClient();
      const created = await owner.client.post('/api/v1/tasks/create', {
        json: taskPayload(),
      });

      const response = await intruder.client.patch(
        `/api/v1/tasks/${created.body._id}`,
        { json: { name: 'Hacked' } },
      );
      const unchanged = await owner.client.get(
        `/api/v1/tasks/${created.body._id}`,
      );

      expect(response.status).toBe(403);
      expect(unchanged.body.name).toBe('Read Atomic Habits');
    });

    it('rejects empty and invalid updates', async () => {
      const { client } = await signedInClient();
      const created = await client.post('/api/v1/tasks/create', {
        json: taskPayload(),
      });
      const path = `/api/v1/tasks/${created.body._id}`;

      expect((await client.patch(path, { json: {} })).status).toBe(400);
      expect(
        (await client.patch(path, { json: { due: 'never' } })).status,
      ).toBe(400);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('deletes the task', async () => {
      const { client } = await signedInClient();
      const created = await client.post('/api/v1/tasks/create', {
        json: taskPayload(),
      });

      const response = await client.delete(`/api/v1/tasks/${created.body._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Task has been deleted' });
      expect(
        (await client.get(`/api/v1/tasks/${created.body._id}`)).status,
      ).toBe(404);
    });

    it('answers 403 for tasks of other users and keeps them', async () => {
      const owner = await signedInClient();
      const intruder = await signedInClient();
      const created = await owner.client.post('/api/v1/tasks/create', {
        json: taskPayload(),
      });

      const response = await intruder.client.delete(
        `/api/v1/tasks/${created.body._id}`,
      );

      expect(response.status).toBe(403);
      expect(
        (await owner.client.get(`/api/v1/tasks/${created.body._id}`)).status,
      ).toBe(200);
    });

    it('answers 404 for unknown tasks', async () => {
      const { client } = await signedInClient();
      const response = await client.delete(`/api/v1/tasks/${MISSING_ID}`);
      expect(response.status).toBe(404);
    });
  });

  describe('cross module behaviour', () => {
    it('removes the tasks of a deleted user and keeps everyone else’s', async () => {
      const leaving = await signedInClient();
      const staying = await signedInClient();
      for (const client of [leaving.client, leaving.client, staying.client]) {
        await client.post('/api/v1/tasks/create', { json: taskPayload() });
      }

      await leaving.client.delete(`/api/v1/users/delete/${leaving.user._id}`);

      const listTasksByUser = app.app.get(ListTasksByUser, { strict: false });
      const gone = await listTasksByUser.execute({
        requesterId: leaving.user._id,
        ownerId: leaving.user._id,
      });
      const kept = await staying.client.get(
        `/api/v1/tasks/user/${staying.user._id}`,
      );

      expect(gone.taskCount).toBe(0);
      expect(kept.body.taskCount).toBe(1);
    });
  });
});
