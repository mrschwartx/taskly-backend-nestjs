import { Injectable } from '@nestjs/common';
import { Task } from '../../domain/task.js';
import { TaskRepository } from '../../domain/task-repository.js';
import { DueDate } from '../../domain/value-objects/due-date.js';
import { TaskDescription } from '../../domain/value-objects/task-description.js';
import { TaskName } from '../../domain/value-objects/task-name.js';
import { TaskPriority } from '../../domain/value-objects/task-priority.js';
import { TaskStatus } from '../../domain/value-objects/task-status.js';
import { toTaskDto, type TaskDto } from '../task-dto.js';

export interface CreateTaskCommand {
  ownerId: string;
  input: unknown;
}

@Injectable()
export class CreateTask {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute({ ownerId, input }: CreateTaskCommand): Promise<TaskDto> {
    const source = (input ?? {}) as Record<string, unknown>;
    const task = Task.create({
      id: this.taskRepository.nextId(),
      ownerId,
      name: TaskName.create(source.name),
      description: TaskDescription.create(source.description),
      priority: TaskPriority.create(source.priority),
      due: DueDate.create(source.due),
      status: TaskStatus.create(source.status),
    });
    await this.taskRepository.add(task);
    return toTaskDto(task);
  }
}
