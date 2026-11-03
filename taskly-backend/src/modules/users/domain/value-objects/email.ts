import { ValidationError } from '../../../../shared/domain/errors.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = 254;

export class Email {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(raw: unknown): Email {
    if (typeof raw !== 'string') {
      throw new ValidationError('Email is required');
    }
    const value = raw.trim();
    if (!value || value.length > MAX_LENGTH || !EMAIL_PATTERN.test(value)) {
      throw new ValidationError('Email is invalid');
    }
    return new Email(value);
  }

  static restore(value: string): Email {
    return new Email(value);
  }

  equals(other: unknown): boolean {
    return other instanceof Email && other.value === this.value;
  }
}
