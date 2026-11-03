import { describe, expect, it } from 'vitest';
import { DueDate } from '../../../../src/modules/tasks/domain/value-objects/due-date.js';
import { ValidationError } from '../../../../src/shared/domain/errors.js';

describe('DueDate', () => {
  it('normalizes accepted inputs to ISO 8601 in UTC', () => {
    expect(DueDate.create('2026-12-08T10:00:00Z').value).toBe(
      '2026-12-08T10:00:00.000Z',
    );
    expect(DueDate.create('2026-03-01T07:00:00+07:00').value).toBe(
      '2026-03-01T00:00:00.000Z',
    );
    expect(DueDate.create(' 2026-03-01 ').value).toBe(
      '2026-03-01T00:00:00.000Z',
    );
  });

  it('rejects missing, blank and unparsable values', () => {
    for (const value of [undefined, null, 42, '', '   ', 'someday']) {
      expect(() => DueDate.create(value)).toThrow(ValidationError);
    }
  });

  it('rejects years outside the range PostgreSQL stores reliably', () => {
    expect(() => DueDate.create('0000-01-01T00:00:00Z')).toThrow(
      ValidationError,
    );
    expect(() => DueDate.create('+010000-01-01T00:00:00Z')).toThrow(
      ValidationError,
    );
  });

  it('compares by value', () => {
    expect(
      DueDate.create('2026-01-01').equals(DueDate.create('2026-01-01T00:00Z')),
    ).toBe(true);
  });
});
