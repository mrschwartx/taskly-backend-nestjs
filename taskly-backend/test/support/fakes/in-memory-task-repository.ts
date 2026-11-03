import {
  Task,
  type TaskSnapshot,
} from '../../../src/modules/tasks/domain/task.js';
import {
  TaskRepository,
  type FindTasksByOwnerQuery,
  type TaskPage,
} from '../../../src/modules/tasks/domain/task-repository.js';
import { generateEntityId } from '../../../src/shared/domain/entity-id.js';

export class InMemoryTaskRepository extends TaskRepository {
  snapshots = new Map<string, TaskSnapshot>();

  nextId(): string {
    return generateEntityId();
  }

  async add(task: Task): Promise<void> {
    const snapshot = task.toSnapshot();
    this.snapshots.set(snapshot.id, snapshot);
  }

  async update(task: Task): Promise<boolean> {
    const snapshot = task.toSnapshot();
    if (!this.snapshots.has(snapshot.id)) {
      return false;
    }
    this.snapshots.set(snapshot.id, snapshot);
    return true;
  }

  async findById(id: string): Promise<Task | null> {
    const snapshot = this.snapshots.get(id);
    return snapshot ? Task.restore(snapshot) : null;
  }

  async findByOwner({
    ownerId,
    status,
    orderBy,
    page,
    pageSize,
  }: FindTasksByOwnerQuery): Promise<TaskPage> {
    const matching = [...this.snapshots.values()]
      .filter(
        (stored) =>
          stored.ownerId === ownerId && (!status || stored.status === status),
      )
      .sort((a, b) =>
        orderBy
          ? String(a[orderBy as keyof TaskSnapshot]).localeCompare(
              String(b[orderBy as keyof TaskSnapshot]),
            )
          : 0,
      );
    const start = (page - 1) * pageSize;
    return {
      tasks: matching
        .slice(start, start + pageSize)
        .map((stored) => Task.restore(stored)),
      total: matching.length,
    };
  }

  async deleteById(id: string): Promise<boolean> {
    return this.snapshots.delete(id);
  }

  async deleteByOwner(ownerId: string): Promise<number> {
    let deleted = 0;
    for (const [id, stored] of this.snapshots) {
      if (stored.ownerId === ownerId) {
        this.snapshots.delete(id);
        deleted += 1;
      }
    }
    return deleted;
  }
}
