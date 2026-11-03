import { Injectable } from '@nestjs/common';
import { parseEntityId } from '../../../../shared/domain/entity-id.js';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/errors.js';
import { TaskRepository } from '../../domain/task-repository.js';
import { toTaskDto, type TaskDto } from '../task-dto.js';

export interface GetTaskQuery {
  requesterId: string;
  taskId: unknown;
}

@Injectable()
export class GetTask {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute({ requesterId, taskId }: GetTaskQuery): Promise<TaskDto> {
    const id = parseEntityId(taskId, 'task');
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found!');
    }
    if (!task.isOwnedBy(requesterId)) {
      throw new ForbiddenError('You are not authorized to view this task');
    }
    return toTaskDto(task);
  }
}
