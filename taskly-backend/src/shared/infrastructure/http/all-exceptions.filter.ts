import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError, type DomainErrorCode } from '../../domain/errors.js';
import { AppLogger } from '../logging/app-logger.js';
import { RequestBodyError } from './request-body-error.js';

const DEFAULT_MESSAGE =
  "We're having technical issues. Please try again later.";

const STATUS_BY_CODE: Readonly<Record<DomainErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 422,
  AUTHENTICATION_FAILED: 401,
  FORBIDDEN: 403,
};

interface ClientError {
  status: number;
  message: string;
}

const resolveClientError = (exception: unknown): ClientError | null => {
  if (exception instanceof DomainError) {
    return {
      status: STATUS_BY_CODE[exception.code],
      message: exception.message,
    };
  }
  if (exception instanceof RequestBodyError) {
    return { status: exception.status, message: exception.message };
  }
  if (exception instanceof HttpException && exception.getStatus() < 500) {
    return { status: exception.getStatus(), message: exception.message };
  }
  return null;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException && exception.getStatus() === 404) {
      response.status(404).json({ message: 'Not found' });
      return;
    }

    const clientError = resolveClientError(exception);
    if (clientError) {
      this.logger.warn('Request rejected', {
        status: clientError.status,
        message: clientError.message,
      });
      response.status(clientError.status).json({
        status: clientError.status,
        message: clientError.message,
      });
      return;
    }

    const failure = exception as Error;
    this.logger.error('Unhandled error', {
      message: failure?.message,
      stack: failure?.stack,
    });
    response.status(500).json({ status: 500, message: DEFAULT_MESSAGE });
  }
}
