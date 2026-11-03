import type { Task } from '../domain/task.js';

export interface TaskDto {
  _id: string;
  name: string;
  description: string;
  priority: string;
  due: string;
  status: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export const toTaskDto = (task: Task): TaskDto => ({
  _id: task.id,
  name: task.name.value,
  description: task.description.value,
  priority: task.priority.value,
  due: task.due.value,
  status: task.status.value,
  owner: task.ownerId,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});
