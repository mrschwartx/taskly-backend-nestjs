import { Global, Module } from '@nestjs/common';
import { APP_CONFIG } from '../../../config/config.constants.js';
import type { Config } from '../../../config/env.js';
import { AppLogger } from './app-logger.js';

@Global()
@Module({
  providers: [
    {
      provide: AppLogger,
      inject: [APP_CONFIG],
      useFactory: (config: Config) => new AppLogger(config),
    },
  ],
  exports: [AppLogger],
})
export class LoggerModule {}
