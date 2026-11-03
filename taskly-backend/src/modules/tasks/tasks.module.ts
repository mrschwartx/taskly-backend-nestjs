import { Module } from '@nestjs/common';
import { CreateTask } from './application/use-cases/create-task.js';
import { DeleteTask } from './application/use-cases/delete-task.js';
import { DeleteTasksByOwner } from './application/use-cases/delete-tasks-by-owner.js';
import { GetTask } from './application/use-cases/get-task.js';
import { ListTasksByUser } from './application/use-cases/list-tasks-by-user.js';
import { UpdateTask } from './application/use-cases/update-task.js';
import { TaskRepository } from './domain/task-repository.js';
import { PostgresTaskRepository } from './infrastructure/postgres-task-repository.js';
import { UserDeletedSubscriber } from './presentation/events/user-deleted.subscriber.js';
import { TasksController } from './presentation/http/tasks.controller.js';
import { UsersModule } from '../users/index.js';

@Module({
  imports: [UsersModule],
  controllers: [TasksController],
  providers: [
    { provide: TaskRepository, useClass: PostgresTaskRepository },
    CreateTask,
    GetTask,
    ListTasksByUser,
    UpdateTask,
    DeleteTask,
    DeleteTasksByOwner,
    UserDeletedSubscriber,
  ],
})
export class TasksModule {}
