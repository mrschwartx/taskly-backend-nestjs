import { Injectable } from '@nestjs/common';
import { generateEntityId } from '../../../shared/domain/entity-id.js';
import { AlreadyExistsError } from '../../../shared/domain/errors.js';
import { isUniqueViolationError } from '../../../shared/infrastructure/postgres/is-unique-violation-error.js';
import { PostgresService } from '../../../shared/infrastructure/postgres/postgres.service.js';
import { User } from '../domain/user.js';
import {
  UserRepository,
  type UniquenessCheck,
  type UserSearch,
} from '../domain/user-repository.js';

const DUPLICATE_MESSAGE = 'Email or Username is already registered.';

const COLUMNS =
  'id, username, email, password_hash, avatar_file, created_at, updated_at';

const escapeLikePattern = (value: string): string =>
  value.replace(/[\\%_]/g, '\\$&');

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_file: string;
  created_at: Date;
  updated_at: Date;
}

const toEntity = (row: UserRow): User =>
  User.restore({
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    avatar: row.avatar_file,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  });

@Injectable()
export class PostgresUserRepository extends UserRepository {
  constructor(private readonly database: PostgresService) {
    super();
  }

  nextId(): string {
    return generateEntityId();
  }

  async add(user: User): Promise<void> {
    const snapshot = user.toSnapshot();
    try {
      await this.database.pool.query(
        `INSERT INTO users (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          snapshot.id,
          snapshot.username,
          snapshot.email,
          snapshot.passwordHash,
          snapshot.avatar,
          snapshot.createdAt,
          snapshot.updatedAt,
        ],
      );
    } catch (error) {
      if (isUniqueViolationError(error)) {
        throw new AlreadyExistsError(DUPLICATE_MESSAGE);
      }
      throw error;
    }
  }

  async update(user: User): Promise<boolean> {
    const snapshot = user.toSnapshot();
    try {
      const result = await this.database.pool.query(
        `UPDATE users
            SET username = $2,
                email = $3,
                password_hash = $4,
                avatar_file = $5,
                updated_at = $6
          WHERE id = $1`,
        [
          snapshot.id,
          snapshot.username,
          snapshot.email,
          snapshot.passwordHash,
          snapshot.avatar,
          snapshot.updatedAt,
        ],
      );
      return result.rowCount === 1;
    } catch (error) {
      if (isUniqueViolationError(error)) {
        throw new AlreadyExistsError(DUPLICATE_MESSAGE);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.database.pool.query<UserRow>(
      `SELECT ${COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.database.pool.query<UserRow>(
      `SELECT ${COLUMNS} FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async existsByEmailOrUsername({
    email,
    username,
    excludeId,
  }: UniquenessCheck): Promise<boolean> {
    const values: unknown[] = [];
    const conditions: string[] = [];
    if (email !== undefined) {
      values.push(email);
      conditions.push(`lower(email) = lower($${values.length})`);
    }
    if (username !== undefined) {
      values.push(username);
      conditions.push(`lower(username) = lower($${values.length})`);
    }
    if (conditions.length === 0) {
      return false;
    }

    let sql = `SELECT 1 FROM users WHERE (${conditions.join(' OR ')})`;
    if (excludeId) {
      values.push(excludeId);
      sql += ` AND id <> $${values.length}`;
    }

    const { rowCount } = await this.database.pool.query(
      `${sql} LIMIT 1`,
      values,
    );
    return (rowCount ?? 0) > 0;
  }

  async search({ username, email }: UserSearch = {}): Promise<User[]> {
    const values: string[] = [];
    const conditions: string[] = [];
    if (username) {
      values.push(`%${escapeLikePattern(username)}%`);
      conditions.push(`username ILIKE $${values.length}`);
    }
    if (email) {
      values.push(`%${escapeLikePattern(email)}%`);
      conditions.push(`email ILIKE $${values.length}`);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.database.pool.query<UserRow>(
      `SELECT ${COLUMNS} FROM users ${where} ORDER BY created_at ASC, id ASC`,
      values,
    );
    return rows.map(toEntity);
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.database.pool.query(
      'DELETE FROM users WHERE id = $1',
      [id],
    );
    return result.rowCount === 1;
  }
}
