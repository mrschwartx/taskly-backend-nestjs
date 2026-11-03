import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_CONFIG } from './config.constants.js';
import { loadConfig, type Config } from './env.js';

@Global()
@Module({})
export class ConfigModule {
  static forRoot(config: Config = loadConfig()): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
