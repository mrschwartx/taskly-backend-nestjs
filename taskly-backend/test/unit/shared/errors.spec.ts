import { describe, expect, it } from 'vitest';
import {
  AlreadyExistsError,
  AuthenticationError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../src/shared/domain/errors.js';

describe('domain errors', () => {
  const cases = [
    [ValidationError, 'VALIDATION_ERROR'],
    [NotFoundError, 'NOT_FOUND'],
    [AlreadyExistsError, 'ALREADY_EXISTS'],
    [AuthenticationError, 'AUTHENTICATION_FAILED'],
    [ForbiddenError, 'FORBIDDEN'],
  ] as const;

  for (const [ErrorClass, code] of cases) {
    it(`${ErrorClass.name} carries code ${code}`, () => {
      const error = new ErrorClass('boom');
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(code);
      expect(error.name).toBe(ErrorClass.name);
      expect(error.message).toBe('boom');
    });
  }
});
