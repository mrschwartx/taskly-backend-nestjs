import { RequestMethod } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { APP_CONFIG } from '../config/config.constants.js';
import type { Config } from '../config/env.js';
import { AllExceptionsFilter } from '../shared/infrastructure/http/all-exceptions.filter.js';
import { createJsonBodyParser } from '../shared/infrastructure/http/json-body-parser.js';
import { createRequestLogger } from '../shared/infrastructure/http/request-logger.js';
import { AppLogger } from '../shared/infrastructure/logging/app-logger.js';

export const API_PREFIX = 'api/v1';

export const configureApp = (app: NestExpressApplication): void => {
  const config = app.get<Config>(APP_CONFIG);
  const logger = app.get(AppLogger);

  app.useLogger(logger);
  app.disable('x-powered-by');
  app.enableCors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use(createJsonBodyParser());
  app.use(cookieParser());
  app.use(createRequestLogger(logger));
  app.useStaticAssets(config.storage.publicDir, {
    setHeaders: (response) =>
      response.setHeader('X-Content-Type-Options', 'nosniff'),
  });
  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
  app.useGlobalFilters(new AllExceptionsFilter(logger));
};
