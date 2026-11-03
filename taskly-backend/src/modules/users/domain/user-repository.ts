import type { User } from './user.js';

export interface UniquenessCheck {
  email?: string;
  username?: string;
  excludeId?: string;
}

export interface UserSearch {
  username?: string;
  email?: string;
}

export abstract class UserRepository {
  abstract nextId(): string;
  abstract add(user: User): Promise<void>;
  abstract update(user: User): Promise<boolean>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract existsByEmailOrUsername(check: UniquenessCheck): Promise<boolean>;
  abstract search(criteria?: UserSearch): Promise<User[]>;
  abstract deleteById(id: string): Promise<boolean>;
}
