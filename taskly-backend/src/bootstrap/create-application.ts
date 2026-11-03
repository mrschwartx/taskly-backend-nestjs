import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../app.module.js';
import type { Config } from '../config/env.js';
import { configureApp } from './configure-app.js';

export const createApplication = async (
  config: Config,
): Promise<NestExpressApplication> => {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(config),
    { bodyParser: false, abortOnError: false, logger: false },
  );
  configureApp(app);
  return app;
};
