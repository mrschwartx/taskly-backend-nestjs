import { Injectable } from '@nestjs/common';
import { parseEntityId } from '../../../../shared/domain/entity-id.js';
import {
  ForbiddenError,
  NotFoundError,
} from '../../../../shared/domain/errors.js';
import { TaskRepository } from '../../domain/task-repository.js';

export interface DeleteTaskCommand {
  requesterId: string;
  taskId: unknown;
}

@Injectable()
export class DeleteTask {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute({ requesterId, taskId }: DeleteTaskCommand): Promise<void> {
    const id = parseEntityId(taskId, 'task');
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found!');
    }
    if (!task.isOwnedBy(requesterId)) {
      throw new ForbiddenError('You are not authorized to delete this task');
    }

    const deleted = await this.taskRepository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('Task not found!');
    }
  }
}
