import {
  BadRequestException,
  NotFoundException,
  type ArgumentsHost,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  AlreadyExistsError,
  AuthenticationError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../src/shared/domain/errors.js';
import { AllExceptionsFilter } from '../../../src/shared/infrastructure/http/all-exceptions.filter.js';
import { RequestBodyError } from '../../../src/shared/infrastructure/http/request-body-error.js';
import { createSpyLogger } from '../../support/silent-logger.js';

const createResponse = () => {
  const response = {
    statusCode: 0,
    body: undefined as any,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response;
    },
  };
  return response;
};

describe('AllExceptionsFilter', () => {
  const handle = (error: unknown) => {
    const logger = createSpyLogger();
    const response = createResponse();
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;
    new AllExceptionsFilter(logger).catch(error, host);
    return { response, logger };
  };

  const mappings: [DomainError, number][] = [
    [new ValidationError('bad'), 400],
    [new AuthenticationError('who are you'), 401],
    [new ForbiddenError('nope'), 403],
    [new NotFoundError('missing'), 404],
    [new AlreadyExistsError('taken'), 422],
  ];

  for (const [error, status] of mappings) {
    it(`maps ${error.name} to ${status}`, () => {
      const { response } = handle(error);
      expect(response.statusCode).toBe(status);
      expect(response.body).toEqual({ status, message: error.message });
    });
  }

  it('maps malformed JSON bodies to 400', () => {
    const { response } = handle(
      new RequestBodyError('Malformed JSON body', 400),
    );
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Malformed JSON body');
  });

  it('maps oversized bodies to 413', () => {
    const { response } = handle(
      new RequestBodyError('Request body is too large', 413),
    );
    expect(response.statusCode).toBe(413);
  });

  it('keeps the status of framework client errors', () => {
    const { response } = handle(
      new BadRequestException('Failed to decode param'),
    );
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Failed to decode param');
  });

  it('hides internals of unexpected errors and logs them', () => {
    const { response, logger } = handle(new Error('db password is hunter2'));
    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      status: 500,
      message: "We're having technical issues. Please try again later.",
    });
    expect(logger.entries.at(-1)?.level).toBe('error');
  });

  it('responds to unknown routes with 404', () => {
    const { response } = handle(new NotFoundException('Cannot GET /x'));
    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ message: 'Not found' });
  });
});
