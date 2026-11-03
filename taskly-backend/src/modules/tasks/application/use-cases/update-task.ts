import { Injectable } from '@nestjs/common';
import { parseEntityId } from '../../../../shared/domain/entity-id.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors.js';
import type { TaskChanges } from '../../domain/task.js';
import { TaskRepository } from '../../domain/task-repository.js';
import { DueDate } from '../../domain/value-objects/due-date.js';
import { TaskDescription } from '../../domain/value-objects/task-description.js';
import { TaskName } from '../../domain/value-objects/task-name.js';
import { TaskPriority } from '../../domain/value-objects/task-priority.js';
import { TaskStatus } from '../../domain/value-objects/task-status.js';
import { toTaskDto, type TaskDto } from '../task-dto.js';

const FIELD_FACTORIES = {
  name: TaskName,
  description: TaskDescription,
  priority: TaskPriority,
  due: DueDate,
  status: TaskStatus,
} as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const parseChanges = (changes: unknown): TaskChanges => {
  const source = isPlainObject(changes) ? changes : {};
  const parsed: Record<string, unknown> = {};
  for (const [field, valueObject] of Object.entries(FIELD_FACTORIES)) {
    if (source[field] !== undefined) {
      parsed[field] = valueObject.create(source[field]);
    }
  }
  if (Object.keys(parsed).length === 0) {
    throw new ValidationError('No updatable fields provided');
  }
  return parsed as TaskChanges;
};

export interface UpdateTaskCommand {
  requesterId: string;
  taskId: unknown;
  changes: unknown;
}

@Injectable()
export class UpdateTask {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute({
    requesterId,
    taskId,
    changes,
  }: UpdateTaskCommand): Promise<TaskDto> {
    const id = parseEntityId(taskId, 'task');
    const task = await this.taskRepository.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found!');
    }
    if (!task.isOwnedBy(requesterId)) {
      throw new ForbiddenError('You are not authorized to update this task');
    }

    task.update(parseChanges(changes));

    const updated = await this.taskRepository.update(task);
    if (!updated) {
      throw new NotFoundError('Task not found!');
    }
    return toTaskDto(task);
  }
}
