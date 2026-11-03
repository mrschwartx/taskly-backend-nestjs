import type { NextFunction, Request, Response } from 'express';
import type { AppLogger } from '../logging/app-logger.js';

export const createRequestLogger =
  (logger: AppLogger) =>
  (request: Request, response: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();
    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      logger.info('HTTP request', {
        method: request.method,
        path: request.originalUrl.split('?')[0],
        status: response.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });
    next();
  };
