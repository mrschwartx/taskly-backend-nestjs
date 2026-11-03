import {
  normalizeText,
  TextValueObject,
} from '../../../../shared/domain/text-value-object.js';

export class TaskName extends TextValueObject {
  static create(raw: unknown): TaskName {
    return new TaskName(
      normalizeText(raw, { label: 'Task name', minLength: 1, maxLength: 120 }),
    );
  }

  static restore(value: string): TaskName {
    return new TaskName(value);
  }
}
