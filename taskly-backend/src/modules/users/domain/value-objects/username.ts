import { ValidationError } from '../../../../shared/domain/errors.js';

const MIN_LENGTH = 3;
const MAX_LENGTH = 50;

export class Username {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(raw: unknown): Username {
    if (typeof raw !== 'string') {
      throw new ValidationError('Username is required');
    }
    const value = raw.trim();
    if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) {
      throw new ValidationError(
        `Username must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`,
      );
    }
    return new Username(value);
  }

  static restore(value: string): Username {
    return new Username(value);
  }

  equals(other: unknown): boolean {
    return other instanceof Username && other.value === this.value;
  }
}
