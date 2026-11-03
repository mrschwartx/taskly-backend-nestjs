import { beforeEach, describe, expect, it } from 'vitest';
import { CreateTask } from '../../../../src/modules/tasks/application/use-cases/create-task.js';
import { DeleteTask } from '../../../../src/modules/tasks/application/use-cases/delete-task.js';
import { DeleteTasksByOwner } from '../../../../src/modules/tasks/application/use-cases/delete-tasks-by-owner.js';
import { GetTask } from '../../../../src/modules/tasks/application/use-cases/get-task.js';
import {
  ListTasksByUser,
  TASKS_PAGE_SIZE,
  type ListTasksByUserQuery,
} from '../../../../src/modules/tasks/application/use-cases/list-tasks-by-user.js';
import { UpdateTask } from '../../../../src/modules/tasks/application/use-cases/update-task.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../src/shared/domain/errors.js';
import {
  buildTask,
  MISSING_ID,
  OTHER_USER_ID,
  TASK_ID,
  USER_ID,
} from '../../../support/builders.js';
import { InMemoryTaskRepository } from '../../../support/fakes/in-memory-task-repository.js';

const validInput = {
  name: 'Read Atomic Habits',
  description: 'Finish reading Atomic Habits by James Clear',
  priority: 'low',
  due: '2026-12-08T10:00:00Z',
  status: 'todo',
};

describe('task use cases', () => {
  let taskRepository: InMemoryTaskRepository;

  beforeEach(async () => {
    taskRepository = new InMemoryTaskRepository();
    await taskRepository.add(buildTask());
  });

  describe('CreateTask', () => {
    it('creates a task owned by the requester', async () => {
      const task = await new CreateTask(taskRepository).execute({
        ownerId: USER_ID,
        input: validInput,
      });

      expect(task._id).toMatch(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
      expect(task.owner).toBe(USER_ID);
      expect(task.name).toBe('Read Atomic Habits');
      expect(task.status).toBe('todo');
      expect(taskRepository.snapshots.size).toBe(2);
    });

    it('applies defaults for description and status', async () => {
      const { name, priority, due } = validInput;
      const task = await new CreateTask(taskRepository).execute({
        ownerId: USER_ID,
        input: { name, priority, due },
      });
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
    });

    it('ignores client supplied owner and ids', async () => {
      const task = await new CreateTask(taskRepository).execute({
        ownerId: USER_ID,
        input: { ...validInput, owner: OTHER_USER_ID, _id: TASK_ID },
      });
      expect(task.owner).toBe(USER_ID);
      expect(task._id).not.toBe(TASK_ID);
    });

    it('rejects invalid input', async () => {
      const createTask = new CreateTask(taskRepository);
      for (const input of [
        undefined,
        {},
        { ...validInput, name: '' },
        { ...validInput, due: 'tomorrow' },
        { ...validInput, priority: undefined },
      ]) {
        await expect(
          createTask.execute({ ownerId: USER_ID, input }),
        ).rejects.toThrow(ValidationError);
      }
      expect(taskRepository.snapshots.size).toBe(1);
    });
  });

  describe('GetTask', () => {
    it('returns the task to its owner', async () => {
      const task = await new GetTask(taskRepository).execute({
        requesterId: USER_ID,
        taskId: TASK_ID,
      });
      expect(task._id).toBe(TASK_ID);
      expect(task.owner).toBe(USER_ID);
    });

    it('rejects other users', async () => {
      await expect(
        new GetTask(taskRepository).execute({
          requesterId: OTHER_USER_ID,
          taskId: TASK_ID,
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('fails for unknown or malformed ids', async () => {
      const getTask = new GetTask(taskRepository);
      await expect(
        getTask.execute({ requesterId: USER_ID, taskId: MISSING_ID }),
      ).rejects.toThrow(new NotFoundError('Task not found!'));
      await expect(
        getTask.execute({ requesterId: USER_ID, taskId: 'bad' }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('ListTasksByUser', () => {
    beforeEach(async () => {
      for (let index = 0; index < 6; index += 1) {
        await taskRepository.add(
          buildTask({ id: `${String(index).padStart(2, '0')}`.repeat(12) }),
        );
      }
      await taskRepository.add(
        buildTask({
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          ownerId: OTHER_USER_ID,
        }),
      );
    });

    const list = (params: Partial<ListTasksByUserQuery>) =>
      new ListTasksByUser(taskRepository).execute({
        requesterId: USER_ID,
        ownerId: USER_ID,
        ...params,
      });

    it('paginates with a fixed page size and reports the total', async () => {
      const first = await list({ page: '1' });
      const second = await list({ page: '2' });

      expect(first.tasks).toHaveLength(TASKS_PAGE_SIZE);
      expect(second.tasks).toHaveLength(3);
      expect(first.taskCount).toBe(7);
    });

    it('defaults to the first page for missing or invalid pages', async () => {
      const expected = (await list({ page: '1' })).tasks.map(
        (task) => task._id,
      );
      for (const page of [undefined, 'abc', '0', '-3']) {
        const result = await list({ page });
        expect(result.tasks.map((task) => task._id)).toEqual(expected);
      }
    });

    it('filters by status', async () => {
      const result = await list({ status: 'done' });
      expect(result).toEqual({ tasks: [], taskCount: 0 });
    });

    it('never includes tasks of other users', async () => {
      const result = await list({ page: '2' });
      expect(result.tasks.every((task) => task.owner === USER_ID)).toBe(true);
    });

    it('forbids listing another user', async () => {
      await expect(list({ ownerId: OTHER_USER_ID })).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('rejects invalid filters', async () => {
      await expect(list({ ownerId: 'bad' })).rejects.toThrow(ValidationError);
      await expect(list({ orderBy: 'owner' })).rejects.toThrow(ValidationError);
      await expect(list({ orderBy: '$where' })).rejects.toThrow(
        ValidationError,
      );
      await expect(list({ status: ['a', 'b'] })).rejects.toThrow(
        ValidationError,
      );
    });

    it('accepts sortable fields', async () => {
      await expect(list({ orderBy: 'due' })).resolves.toBeDefined();
    });
  });

  describe('UpdateTask', () => {
    const update = (
      changes: unknown,
      overrides: { requesterId?: string; taskId?: string } = {},
    ) =>
      new UpdateTask(taskRepository).execute({
        requesterId: USER_ID,
        taskId: TASK_ID,
        changes,
        ...overrides,
      });

    it('updates the provided fields', async () => {
      const task = await update({
        name: 'Updated',
        priority: 'high',
        status: 'in_progress',
      });
      expect(task.name).toBe('Updated');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('in_progress');
      expect(task.due).toBe('2026-12-08T10:00:00.000Z');
      expect(taskRepository.snapshots.get(TASK_ID)?.name).toBe('Updated');
    });

    it('never lets the owner or id change', async () => {
      const task = await update({
        name: 'Updated',
        owner: OTHER_USER_ID,
        ownerId: OTHER_USER_ID,
        _id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      });
      expect(task.owner).toBe(USER_ID);
      expect(task._id).toBe(TASK_ID);
    });

    it('rejects other users', async () => {
      await expect(
        update({ name: 'Hijack' }, { requesterId: OTHER_USER_ID }),
      ).rejects.toThrow(
        new ForbiddenError('You are not authorized to update this task'),
      );
      expect(taskRepository.snapshots.get(TASK_ID)?.name).toBe(
        'Read Atomic Habits',
      );
    });

    it('rejects empty or invalid changes', async () => {
      for (const changes of [{}, null, [], { owner: OTHER_USER_ID }]) {
        await expect(update(changes)).rejects.toThrow(ValidationError);
      }
      await expect(update({ due: 'never' })).rejects.toThrow(ValidationError);
      await expect(update({ name: '' })).rejects.toThrow(ValidationError);
    });

    it('fails when the task does not exist', async () => {
      await expect(
        update({ name: 'x' }, { taskId: MISSING_ID }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('DeleteTask', () => {
    it('deletes the task of the owner', async () => {
      await new DeleteTask(taskRepository).execute({
        requesterId: USER_ID,
        taskId: TASK_ID,
      });
      expect(taskRepository.snapshots.has(TASK_ID)).toBe(false);
    });

    it('rejects other users and keeps the task', async () => {
      await expect(
        new DeleteTask(taskRepository).execute({
          requesterId: OTHER_USER_ID,
          taskId: TASK_ID,
        }),
      ).rejects.toThrow(
        new ForbiddenError('You are not authorized to delete this task'),
      );
      expect(taskRepository.snapshots.has(TASK_ID)).toBe(true);
    });

    it('fails when the task does not exist', async () => {
      await expect(
        new DeleteTask(taskRepository).execute({
          requesterId: USER_ID,
          taskId: MISSING_ID,
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('DeleteTasksByOwner', () => {
    it('removes every task of the owner and nothing else', async () => {
      await taskRepository.add(
        buildTask({
          id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          ownerId: OTHER_USER_ID,
        }),
      );

      const deleted = await new DeleteTasksByOwner(taskRepository).execute({
        ownerId: USER_ID,
      });

      expect(deleted).toBe(1);
      expect([...taskRepository.snapshots.keys()]).toEqual([
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
      ]);
    });

    it('rejects malformed owner ids', async () => {
      await expect(
        new DeleteTasksByOwner(taskRepository).execute({ ownerId: 'x' }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
