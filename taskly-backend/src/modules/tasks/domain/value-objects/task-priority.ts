import {
  normalizeText,
  TextValueObject,
} from '../../../../shared/domain/text-value-object.js';

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

export type TaskPriorityValue = (typeof TASK_PRIORITIES)[number];

export class TaskPriority extends TextValueObject<TaskPriorityValue> {
  static create(raw: unknown): TaskPriority {
    const value = normalizeText(raw, {
      label: 'Task priority',
      minLength: 1,
      maxLength: 50,
      allowedValues: TASK_PRIORITIES,
    });
    return new TaskPriority(value as TaskPriorityValue);
  }

  static restore(value: TaskPriorityValue): TaskPriority {
    return new TaskPriority(value);
  }
}
