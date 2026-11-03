import { DueDate } from './value-objects/due-date.js';
import { TaskDescription } from './value-objects/task-description.js';
import { TaskName } from './value-objects/task-name.js';
import {
  TaskPriority,
  type TaskPriorityValue,
} from './value-objects/task-priority.js';
import {
  TaskStatus,
  type TaskStatusValue,
} from './value-objects/task-status.js';

export interface TaskProps {
  id: string;
  ownerId: string;
  name: TaskName;
  description: TaskDescription;
  priority: TaskPriority;
  due: DueDate;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NewTask {
  id: string;
  ownerId: string;
  name: TaskName;
  description: TaskDescription;
  priority: TaskPriority;
  due: DueDate;
  status: TaskStatus;
  now?: Date;
}

export interface TaskChanges {
  name?: TaskName;
  description?: TaskDescription;
  priority?: TaskPriority;
  due?: DueDate;
  status?: TaskStatus;
}

export interface TaskSnapshot {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  priority: TaskPriorityValue;
  due: string;
  status: TaskStatusValue;
  createdAt: string;
  updatedAt: string;
}

export class Task {
  private _name: TaskName;
  private _description: TaskDescription;
  private _priority: TaskPriority;
  private _due: DueDate;
  private _status: TaskStatus;
  private _updatedAt: string;

  private constructor(private readonly props: TaskProps) {
    this._name = props.name;
    this._description = props.description;
    this._priority = props.priority;
    this._due = props.due;
    this._status = props.status;
    this._updatedAt = props.updatedAt;
  }

  static create({ now = new Date(), ...fields }: NewTask): Task {
    const timestamp = now.toISOString();
    return new Task({ ...fields, createdAt: timestamp, updatedAt: timestamp });
  }

  static restore(snapshot: TaskSnapshot): Task {
    return new Task({
      id: snapshot.id,
      ownerId: snapshot.ownerId,
      name: TaskName.restore(snapshot.name),
      description: TaskDescription.restore(snapshot.description),
      priority: TaskPriority.restore(snapshot.priority),
      due: DueDate.restore(snapshot.due),
      status: TaskStatus.restore(snapshot.status),
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get name(): TaskName {
    return this._name;
  }

  get description(): TaskDescription {
    return this._description;
  }

  get priority(): TaskPriority {
    return this._priority;
  }

  get due(): DueDate {
    return this._due;
  }

  get status(): TaskStatus {
    return this._status;
  }

  get createdAt(): string {
    return this.props.createdAt;
  }

  get updatedAt(): string {
    return this._updatedAt;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.ownerId === userId;
  }

  update(
    { name, description, priority, due, status }: TaskChanges,
    now: Date = new Date(),
  ): void {
    this._name = name ?? this._name;
    this._description = description ?? this._description;
    this._priority = priority ?? this._priority;
    this._due = due ?? this._due;
    this._status = status ?? this._status;
    this._updatedAt = now.toISOString();
  }

  toSnapshot(): TaskSnapshot {
    return {
      id: this.props.id,
      ownerId: this.props.ownerId,
      name: this._name.value,
      description: this._description.value,
      priority: this._priority.value,
      due: this._due.value,
      status: this._status.value,
      createdAt: this.props.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
