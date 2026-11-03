import { Injectable } from '@nestjs/common';
import { parseEntityId } from '../../../../shared/domain/entity-id.js';
import { TaskRepository } from '../../domain/task-repository.js';

export interface DeleteTasksByOwnerCommand {
  ownerId: unknown;
}

@Injectable()
export class DeleteTasksByOwner {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute({ ownerId }: DeleteTasksByOwnerCommand): Promise<number> {
    const owner = parseEntityId(ownerId, 'user');
    return this.taskRepository.deleteByOwner(owner);
  }
}
