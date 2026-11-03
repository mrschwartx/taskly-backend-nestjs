import {
  normalizeText,
  TextValueObject,
} from '../../../../shared/domain/text-value-object.js';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

export type TaskStatusValue = (typeof TASK_STATUSES)[number];

export const DEFAULT_TASK_STATUS: TaskStatusValue = 'todo';

export class TaskStatus extends TextValueObject<TaskStatusValue> {
  static create(raw: unknown): TaskStatus {
    const value = normalizeText(raw, {
      label: 'Task status',
      minLength: 1,
      maxLength: 50,
      defaultValue: DEFAULT_TASK_STATUS,
      allowedValues: TASK_STATUSES,
    });
    return new TaskStatus(value as TaskStatusValue);
  }

  static restore(value: TaskStatusValue): TaskStatus {
    return new TaskStatus(value);
  }
}
