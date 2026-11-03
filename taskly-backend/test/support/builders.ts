import { Task } from '../../src/modules/tasks/domain/task.js';
import { DueDate } from '../../src/modules/tasks/domain/value-objects/due-date.js';
import { TaskDescription } from '../../src/modules/tasks/domain/value-objects/task-description.js';
import { TaskName } from '../../src/modules/tasks/domain/value-objects/task-name.js';
import { TaskPriority } from '../../src/modules/tasks/domain/value-objects/task-priority.js';
import { TaskStatus } from '../../src/modules/tasks/domain/value-objects/task-status.js';
import { User, type NewUser } from '../../src/modules/users/domain/user.js';
import { Email } from '../../src/modules/users/domain/value-objects/email.js';
import { Username } from '../../src/modules/users/domain/value-objects/username.js';

export const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const OTHER_USER_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const TASK_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
export const MISSING_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

export const buildUser = (overrides: Partial<NewUser> = {}): User =>
  User.register({
    id: USER_ID,
    username: Username.create('johndoe123'),
    email: Email.create('johndoe123@mail.com'),
    passwordHash: 'hashed:password123',
    now: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

export interface TaskOverrides {
  id?: string;
  ownerId?: string;
  name?: TaskName;
  due?: DueDate;
  status?: TaskStatus;
  now?: Date;
}

export const buildTask = (overrides: TaskOverrides = {}): Task =>
  Task.create({
    id: TASK_ID,
    ownerId: USER_ID,
    name: TaskName.create('Read Atomic Habits'),
    description: TaskDescription.create('Finish the book'),
    priority: TaskPriority.create('low'),
    due: DueDate.create('2026-12-08T10:00:00Z'),
    status: TaskStatus.create('todo'),
    now: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
