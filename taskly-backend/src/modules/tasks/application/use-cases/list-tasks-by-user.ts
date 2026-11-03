import { Injectable } from '@nestjs/common';
import { parseEntityId } from '../../../../shared/domain/entity-id.js';
import {
  ForbiddenError,
  ValidationError,
} from '../../../../shared/domain/errors.js';
import { TaskRepository } from '../../domain/task-repository.js';
import { toTaskDto, type TaskDto } from '../task-dto.js';

export const TASKS_PAGE_SIZE = 4;

const SORTABLE_FIELDS: readonly string[] = [
  'name',
  'description',
  'priority',
  'due',
  'status',
  'createdAt',
  'updatedAt',
];

const MAX_PAGE = 1_000_000;

const normalizePage = (page: unknown): number => {
  const parsed = Number.parseInt(page as string, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(parsed, MAX_PAGE);
};

export interface ListTasksByUserQuery {
  requesterId: string;
  ownerId: unknown;
  status?: unknown;
  orderBy?: unknown;
  page?: unknown;
}

export interface TaskListResult {
  tasks: TaskDto[];
  taskCount: number;
}

@Injectable()
export class ListTasksByUser {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute({
    requesterId,
    ownerId,
    status,
    orderBy,
    page,
  }: ListTasksByUserQuery): Promise<TaskListResult> {
    const owner = parseEntityId(ownerId, 'user');
    if (owner !== requesterId) {
      throw new ForbiddenError('You are not authorized to view these tasks');
    }
    if (status !== undefined && typeof status !== 'string') {
      throw new ValidationError('Status filter must be a string');
    }
    if (
      orderBy !== undefined &&
      (typeof orderBy !== 'string' || !SORTABLE_FIELDS.includes(orderBy))
    ) {
      throw new ValidationError('Invalid orderBy field');
    }

    const { tasks, total } = await this.taskRepository.findByOwner({
      ownerId: owner,
      status: status || undefined,
      orderBy,
      page: normalizePage(page),
      pageSize: TASKS_PAGE_SIZE,
    });

    return { tasks: tasks.map(toTaskDto), taskCount: total };
  }
}
