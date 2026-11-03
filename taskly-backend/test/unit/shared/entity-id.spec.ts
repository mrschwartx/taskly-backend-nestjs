import { describe, expect, it } from 'vitest';
import {
  generateEntityId,
  isEntityId,
  parseEntityId,
} from '../../../src/shared/domain/entity-id.js';
import { ValidationError } from '../../../src/shared/domain/errors.js';

describe('entity id', () => {
  it('accepts canonical UUID strings', () => {
    expect(isEntityId('0d3f6b1e-5f0c-4c5e-9d2a-7a1f0b6c8e11')).toBe(true);
    expect(isEntityId('0D3F6B1E-5F0C-4C5E-9D2A-7A1F0B6C8E11')).toBe(true);
  });

  it('rejects everything else', () => {
    for (const value of [
      '',
      'abc',
      '67553c6776ddd71b61bedc10',
      '0d3f6b1e5f0c4c5e9d2a7a1f0b6c8e11',
      'g'.repeat(36),
      123,
      null,
      undefined,
      {},
    ]) {
      expect(isEntityId(value)).toBe(false);
    }
  });

  it('generates unique valid ids', () => {
    const first = generateEntityId();
    expect(isEntityId(first)).toBe(true);
    expect(first).not.toBe(generateEntityId());
  });

  it('normalizes parsed ids to lower case', () => {
    expect(parseEntityId('0D3F6B1E-5F0C-4C5E-9D2A-7A1F0B6C8E11', 'user')).toBe(
      '0d3f6b1e-5f0c-4c5e-9d2a-7a1f0b6c8e11',
    );
  });

  it('throws a validation error with the label for invalid ids', () => {
    expect.assertions(2);
    try {
      parseEntityId('nope', 'task');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toBe('Invalid task ID format');
    }
  });
});
