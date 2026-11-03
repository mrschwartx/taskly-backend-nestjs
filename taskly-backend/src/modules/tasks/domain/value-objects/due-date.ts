import { ValidationError } from '../../../../shared/domain/errors.js';

const MIN_YEAR = 1;
const MAX_YEAR = 9999;

export class DueDate {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(raw: unknown): DueDate {
    if (typeof raw !== 'string' || raw.trim() === '') {
      throw new ValidationError('Task due date is required');
    }
    const timestamp = Date.parse(raw.trim());
    if (Number.isNaN(timestamp)) {
      throw new ValidationError('Task due date is invalid');
    }
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    if (year < MIN_YEAR || year > MAX_YEAR) {
      throw new ValidationError('Task due date is invalid');
    }
    return new DueDate(date.toISOString());
  }

  static restore(value: string): DueDate {
    return new DueDate(value);
  }

  equals(other: unknown): boolean {
    return other instanceof DueDate && other.value === this.value;
  }
}
