import { Injectable } from '@nestjs/common';
import { parseEntityId } from '../../../../shared/domain/entity-id.js';
import {
  AlreadyExistsError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors.js';
import { PasswordHasher } from '../../domain/password-hasher.js';
import { UserRepository } from '../../domain/user-repository.js';
import { Email } from '../../domain/value-objects/email.js';
import { PlainPassword } from '../../domain/value-objects/plain-password.js';
import { Username } from '../../domain/value-objects/username.js';
import { assertOwnAccount } from '../assert-own-account.js';
import { toUserDto, type UserDto } from '../user-dto.js';

const UPDATABLE_FIELDS = ['username', 'email', 'password'] as const;

type UpdatableField = (typeof UPDATABLE_FIELDS)[number];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const pickUpdatableFields = (
  changes: unknown,
): Partial<Record<UpdatableField, unknown>> => {
  if (!isPlainObject(changes)) {
    return {};
  }
  return Object.fromEntries(
    UPDATABLE_FIELDS.filter((field) => changes[field] !== undefined).map(
      (field) => [field, changes[field]],
    ),
  );
};

export interface UpdateUserCommand {
  requesterId: string;
  userId: unknown;
  changes: unknown;
}

@Injectable()
export class UpdateUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute({
    requesterId,
    userId,
    changes,
  }: UpdateUserCommand): Promise<UserDto> {
    assertOwnAccount(
      requesterId,
      userId,
      'You can only update your own account',
    );
    const id = parseEntityId(userId, 'user');

    const input = pickUpdatableFields(changes);
    if (Object.keys(input).length === 0) {
      throw new ValidationError('No updatable fields provided');
    }

    const username =
      input.username !== undefined
        ? Username.create(input.username)
        : undefined;
    const email =
      input.email !== undefined ? Email.create(input.email) : undefined;
    const password =
      input.password !== undefined
        ? PlainPassword.create(input.password)
        : undefined;

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found!');
    }

    if (username || email) {
      const taken = await this.userRepository.existsByEmailOrUsername({
        email: email?.value,
        username: username?.value,
        excludeId: id,
      });
      if (taken) {
        throw new AlreadyExistsError(
          'Email or Username is already registered.',
        );
      }
    }

    const passwordHash = password
      ? await this.passwordHasher.hash(password.value)
      : undefined;

    user.updateProfile({ username, email, passwordHash });

    const updated = await this.userRepository.update(user);
    if (!updated) {
      throw new NotFoundError('User not found!');
    }
    return toUserDto(user);
  }
}
