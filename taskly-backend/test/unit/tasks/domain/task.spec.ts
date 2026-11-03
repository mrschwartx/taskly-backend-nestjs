import { describe, expect, it } from 'vitest';
import { Task } from '../../../../src/modules/tasks/domain/task.js';
import { DueDate } from '../../../../src/modules/tasks/domain/value-objects/due-date.js';
import { TaskDescription } from '../../../../src/modules/tasks/domain/value-objects/task-description.js';
import { TaskName } from '../../../../src/modules/tasks/domain/value-objects/task-name.js';
import { TaskPriority } from '../../../../src/modules/tasks/domain/value-objects/task-priority.js';
import { TaskStatus } from '../../../../src/modules/tasks/domain/value-objects/task-status.js';
import { ValidationError } from '../../../../src/shared/domain/errors.js';
import {
  buildTask,
  OTHER_USER_ID,
  TASK_ID,
  USER_ID,
} from '../../../support/builders.js';

describe('Task', () => {
  it('is created with equal timestamps', () => {
    const task = buildTask();

    expect(task.id).toBe(TASK_ID);
    expect(task.ownerId).toBe(USER_ID);
    expect(task.name.value).toBe('Read Atomic Habits');
    expect(task.status.value).toBe('todo');
    expect(task.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(task.updatedAt).toBe(task.createdAt);
  });

  it('knows its owner', () => {
    const task = buildTask();
    expect(task.isOwnedBy(USER_ID)).toBe(true);
    expect(task.isOwnedBy(OTHER_USER_ID)).toBe(false);
  });

  it('applies partial updates and touches updatedAt', () => {
    const task = buildTask();

    task.update(
      {
        name: TaskName.create('Renamed'),
        status: TaskStatus.create('in_progress'),
      },
      new Date('2026-02-02T00:00:00.000Z'),
    );

    expect(task.name.value).toBe('Renamed');
    expect(task.status.value).toBe('in_progress');
    expect(task.priority.value).toBe('low');
    expect(task.updatedAt).toBe('2026-02-02T00:00:00.000Z');
    expect(task.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('can never change its owner', () => {
    const task = buildTask();
    task.update({ ownerId: OTHER_USER_ID } as never);
    expect(task.ownerId).toBe(USER_ID);
  });

  it('round trips through snapshots', () => {
    const task = buildTask();
    expect(Task.restore(task.toSnapshot()).toSnapshot()).toEqual(
      task.toSnapshot(),
    );
  });
});

describe('task value objects', () => {
  it('TaskName trims and enforces bounds', () => {
    expect(TaskName.create('  Write tests ').value).toBe('Write tests');
    expect(() => TaskName.create('   ')).toThrow(ValidationError);
    expect(() => TaskName.create('a'.repeat(121))).toThrow(ValidationError);
    expect(() => TaskName.create(undefined)).toThrow(ValidationError);
    expect(() => TaskName.create({ $gt: '' })).toThrow(ValidationError);
  });

  it('TaskDescription defaults to an empty string', () => {
    expect(TaskDescription.create(undefined).value).toBe('');
    expect(TaskDescription.create('details').value).toBe('details');
    expect(() => TaskDescription.create('a'.repeat(2001))).toThrow(
      ValidationError,
    );
    expect(() => TaskDescription.create(42)).toThrow(ValidationError);
  });

  it('TaskPriority is required and limited to known values', () => {
    expect(TaskPriority.create('high').value).toBe('high');
    expect(() => TaskPriority.create(undefined)).toThrow(ValidationError);
    expect(() => TaskPriority.create('')).toThrow(ValidationError);
    expect(() => TaskPriority.create('urgent')).toThrow(ValidationError);
    expect(() => TaskPriority.create('HIGH')).toThrow(ValidationError);
  });

  it('TaskStatus defaults to todo', () => {
    expect(TaskStatus.create(undefined).value).toBe('todo');
    expect(TaskStatus.create('in_progress').value).toBe('in_progress');
    expect(() => TaskStatus.create('')).toThrow(ValidationError);
    expect(() => TaskStatus.create('open')).toThrow(ValidationError);
    expect(() => TaskStatus.create('in-progress')).toThrow(ValidationError);
  });

  it('DueDate accepts parseable dates only', () => {
    expect(DueDate.create('2026-12-08T10:00:00Z').value).toBe(
      '2026-12-08T10:00:00.000Z',
    );
    expect(DueDate.create('2026-12-08').value).toBe('2026-12-08T00:00:00.000Z');
    expect(() => DueDate.create('not a date')).toThrow(/invalid/);
    expect(() => DueDate.create(undefined)).toThrow(/required/);
    expect(() => DueDate.create('')).toThrow(/required/);
  });

  it('compares by value within the same type', () => {
    expect(TaskName.create('a').equals(TaskName.create('a'))).toBe(true);
    expect(TaskName.create('a').equals(TaskName.create('b'))).toBe(false);
    expect(TaskName.create('low').equals(TaskPriority.create('low'))).toBe(
      false,
    );
    expect(
      DueDate.create('2026-01-01').equals(DueDate.create('2026-01-01')),
    ).toBe(true);
  });
});
