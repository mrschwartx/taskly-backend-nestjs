import type { Task } from './task.js';

export interface FindTasksByOwnerQuery {
  ownerId: string;
  status?: string;
  orderBy?: string;
  page: number;
  pageSize: number;
}

export interface TaskPage {
  tasks: Task[];
  total: number;
}

export abstract class TaskRepository {
  abstract nextId(): string;
  abstract add(task: Task): Promise<void>;
  abstract update(task: Task): Promise<boolean>;
  abstract findById(id: string): Promise<Task | null>;
  abstract findByOwner(query: FindTasksByOwnerQuery): Promise<TaskPage>;
  abstract deleteById(id: string): Promise<boolean>;
  abstract deleteByOwner(ownerId: string): Promise<number>;
}
