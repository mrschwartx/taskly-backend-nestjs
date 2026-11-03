import { ValidationError } from '../../../../shared/domain/errors.js';

const MIN_LENGTH = 8;
const MAX_BYTES = 72;

export class PlainPassword {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(raw: unknown): PlainPassword {
    if (typeof raw !== 'string') {
      throw new ValidationError('Password is required');
    }
    if (raw.length < MIN_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${MIN_LENGTH} characters long`,
      );
    }
    if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) {
      throw new ValidationError(`Password must not exceed ${MAX_BYTES} bytes`);
    }
    return new PlainPassword(raw);
  }
}
