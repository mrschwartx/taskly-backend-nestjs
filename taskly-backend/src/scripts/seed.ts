import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { loadConfig } from '../config/env.js';
import { CreateTask } from '../modules/tasks/application/use-cases/create-task.js';
import { RegisterUser } from '../modules/users/application/use-cases/register-user.js';
import { AlreadyExistsError } from '../shared/domain/errors.js';
import { AppLogger } from '../shared/infrastructure/logging/app-logger.js';

const now = (): string => new Date().toISOString();

const seeds = [
  {
    user: {
      username: 'johndoe123',
      email: 'johndoe123@mail.com',
      password: 'password123',
    },
    tasks: [
      {
        name: 'Read Atomic Habits',
        description: 'Finish reading Atomic Habits by James Clear',
        priority: 'low',
        due: now(),
        status: 'todo',
      },
    ],
  },
  {
    user: {
      username: 'jane78',
      email: 'jane@mail.com',
      password: 'securepassword456',
    },
    tasks: [
      {
        name: 'Learn MERN Stack',
        description:
          'Learn the MERN stack and build a full-stack application with it',
        priority: 'high',
        due: now(),
        status: 'todo',
      },
    ],
  },
];

const seed = async (): Promise<void> => {
  const config = loadConfig();
  const logger = new AppLogger(config);

  if (config.app.isProduction && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    logger.error('Refusing to seed a production database');
    process.exitCode = 1;
    return;
  }

  const context = await NestFactory.createApplicationContext(
    AppModule.register(config),
    { logger: false },
  );

  try {
    const registerUser = context.get(RegisterUser, { strict: false });
    const createTask = context.get(CreateTask, { strict: false });

    for (const entry of seeds) {
      try {
        const { user } = await registerUser.execute(entry.user);
        for (const task of entry.tasks) {
          await createTask.execute({ ownerId: user._id, input: task });
        }
        logger.info(`Seeded user ${entry.user.username}`);
      } catch (error) {
        if (!(error instanceof AlreadyExistsError)) {
          throw error;
        }
        logger.warn(`Skipped existing user ${entry.user.username}`);
      }
    }
    logger.info('Seeding completed');
  } finally {
    await context.close();
    logger.close();
  }
};

try {
  await seed();
} catch (error) {
  console.error(`Seeding failed: ${(error as Error).message}`);
  process.exitCode = 1;
}
