export type DomainErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'AUTHENTICATION_FAILED'
  | 'FORBIDDEN';

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: DomainErrorCode,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
  }
}

export class AlreadyExistsError extends DomainError {
  constructor(message: string) {
    super(message, 'ALREADY_EXISTS');
  }
}

export class AuthenticationError extends DomainError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_FAILED');
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string) {
    super(message, 'FORBIDDEN');
  }
}
