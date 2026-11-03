import {
  normalizeText,
  TextValueObject,
} from '../../../../shared/domain/text-value-object.js';

export class TaskDescription extends TextValueObject {
  static create(raw: unknown): TaskDescription {
    return new TaskDescription(
      normalizeText(raw, {
        label: 'Task description',
        minLength: 0,
        maxLength: 2000,
        defaultValue: '',
      }),
    );
  }

  static restore(value: string): TaskDescription {
    return new TaskDescription(value);
  }
}
