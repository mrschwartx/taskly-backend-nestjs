import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, RequesterId } from '../../../users/index.js';
import type { TaskDto } from '../../application/task-dto.js';
import { CreateTask } from '../../application/use-cases/create-task.js';
import { DeleteTask } from '../../application/use-cases/delete-task.js';
import { GetTask } from '../../application/use-cases/get-task.js';
import {
  ListTasksByUser,
  type TaskListResult,
} from '../../application/use-cases/list-tasks-by-user.js';
import { UpdateTask } from '../../application/use-cases/update-task.js';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(
    private readonly createTask: CreateTask,
    private readonly getTask: GetTask,
    private readonly listTasksByUser: ListTasksByUser,
    private readonly updateTask: UpdateTask,
    private readonly deleteTask: DeleteTask,
  ) {}

  @Get('user/:id')
  getTasksByUser(
    @RequesterId() requesterId: string,
    @Param('id') ownerId: string,
    @Query('status') status: unknown,
    @Query('orderBy') orderBy: unknown,
    @Query('page') page: unknown,
  ): Promise<TaskListResult> {
    return this.listTasksByUser.execute({
      requesterId,
      ownerId,
      status,
      orderBy,
      page,
    });
  }

  @Get(':id')
  getOne(
    @RequesterId() requesterId: string,
    @Param('id') taskId: string,
  ): Promise<TaskDto> {
    return this.getTask.execute({ requesterId, taskId });
  }

  @Post('create')
  @HttpCode(200)
  create(
    @RequesterId() requesterId: string,
    @Body() body: unknown,
  ): Promise<TaskDto> {
    return this.createTask.execute({ ownerId: requesterId, input: body });
  }

  @Patch(':id')
  update(
    @RequesterId() requesterId: string,
    @Param('id') taskId: string,
    @Body() body: unknown,
  ): Promise<TaskDto> {
    return this.updateTask.execute({ requesterId, taskId, changes: body });
  }

  @Delete(':id')
  async remove(
    @RequesterId() requesterId: string,
    @Param('id') taskId: string,
  ): Promise<{ message: string }> {
    await this.deleteTask.execute({ requesterId, taskId });
    return { message: 'Task has been deleted' };
  }
}
