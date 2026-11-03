import {
  User,
  type UserSnapshot,
} from '../../../src/modules/users/domain/user.js';
import {
  UserRepository,
  type UniquenessCheck,
  type UserSearch,
} from '../../../src/modules/users/domain/user-repository.js';
import { generateEntityId } from '../../../src/shared/domain/entity-id.js';
import { AlreadyExistsError } from '../../../src/shared/domain/errors.js';

export class InMemoryUserRepository extends UserRepository {
  snapshots = new Map<string, UserSnapshot>();

  nextId(): string {
    return generateEntityId();
  }

  async add(user: User): Promise<void> {
    const snapshot = user.toSnapshot();
    const duplicate = [...this.snapshots.values()].some(
      (stored) =>
        stored.email === snapshot.email ||
        stored.username === snapshot.username,
    );
    if (duplicate) {
      throw new AlreadyExistsError('Email or Username is already registered.');
    }
    this.snapshots.set(snapshot.id, snapshot);
  }

  async update(user: User): Promise<boolean> {
    const snapshot = user.toSnapshot();
    if (!this.snapshots.has(snapshot.id)) {
      return false;
    }
    this.snapshots.set(snapshot.id, snapshot);
    return true;
  }

  async findById(id: string): Promise<User | null> {
    const snapshot = this.snapshots.get(id);
    return snapshot ? User.restore(snapshot) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const snapshot = [...this.snapshots.values()].find(
      (stored) => stored.email === email,
    );
    return snapshot ? User.restore(snapshot) : null;
  }

  async existsByEmailOrUsername({
    email,
    username,
    excludeId,
  }: UniquenessCheck): Promise<boolean> {
    return [...this.snapshots.values()].some(
      (stored) =>
        stored.id !== excludeId &&
        ((email !== undefined && stored.email === email) ||
          (username !== undefined && stored.username === username)),
    );
  }

  async search({ username, email }: UserSearch = {}): Promise<User[]> {
    return [...this.snapshots.values()]
      .filter(
        (stored) =>
          (!username ||
            stored.username.toLowerCase().includes(username.toLowerCase())) &&
          (!email || stored.email.toLowerCase().includes(email.toLowerCase())),
      )
      .map((stored) => User.restore(stored));
  }

  async deleteById(id: string): Promise<boolean> {
    return this.snapshots.delete(id);
  }
}
