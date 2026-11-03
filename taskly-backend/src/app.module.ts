import { DynamicModule, Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ConfigModule } from './config/config.module.js';
import { loadConfig, type Config } from './config/env.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { EventsModule } from './shared/infrastructure/events/events.module.js';
import { LoggerModule } from './shared/infrastructure/logging/logger.module.js';
import { PostgresModule } from './shared/infrastructure/postgres/postgres.module.js';

@Module({
  imports: [
    LoggerModule,
    EventsModule,
    PostgresModule,
    UsersModule,
    TasksModule,
  ],
  controllers: [AppController],
})
export class AppModule {
  static register(config: Config = loadConfig()): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(config)],
    };
  }
}
