import { beforeEach, describe, expect, it } from 'vitest';
import { GetUser } from '../../../../src/modules/users/application/use-cases/get-user.js';
import { ListUsers } from '../../../../src/modules/users/application/use-cases/list-users.js';
import { User } from '../../../../src/modules/users/domain/user.js';
import { Email } from '../../../../src/modules/users/domain/value-objects/email.js';
import { Username } from '../../../../src/modules/users/domain/value-objects/username.js';
import {
  NotFoundError,
  ValidationError,
} from '../../../../src/shared/domain/errors.js';
import { buildUser, MISSING_ID, USER_ID } from '../../../support/builders.js';
import { InMemoryUserRepository } from '../../../support/fakes/in-memory-user-repository.js';

describe('user queries', () => {
  let userRepository: InMemoryUserRepository;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    await userRepository.add(buildUser());
    await userRepository.add(
      User.register({
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        username: Username.create('jane78'),
        email: Email.create('jane@mail.com'),
        passwordHash: 'hashed:x',
      }),
    );
  });

  describe('GetUser', () => {
    it('returns a public view of the user', async () => {
      const user = await new GetUser(userRepository).execute({
        userId: USER_ID,
      });

      expect(user._id).toBe(USER_ID);
      expect(user.username).toBe('johndoe123');
      expect('passwordHash' in user).toBe(false);
    });

    it('rejects malformed ids', async () => {
      await expect(
        new GetUser(userRepository).execute({ userId: 'nope' }),
      ).rejects.toThrow(new ValidationError('Invalid user ID format'));
    });

    it('fails when the user does not exist', async () => {
      await expect(
        new GetUser(userRepository).execute({ userId: MISSING_ID }),
      ).rejects.toThrow(new NotFoundError('User not found!'));
    });
  });

  describe('ListUsers', () => {
    it('returns all users when no filter is given', async () => {
      const users = await new ListUsers(userRepository).execute({});
      expect(users).toHaveLength(2);
      expect(users.every((user) => !('passwordHash' in user))).toBe(true);
    });

    it('filters by username case-insensitively', async () => {
      const users = await new ListUsers(userRepository).execute({
        username: 'JANE',
      });
      expect(users.map((user) => user.username)).toEqual(['jane78']);
    });

    it('filters by email', async () => {
      const users = await new ListUsers(userRepository).execute({
        email: 'johndoe',
      });
      expect(users).toHaveLength(1);
    });

    it('fails when nothing matches', async () => {
      await expect(
        new ListUsers(userRepository).execute({ username: 'zzz' }),
      ).rejects.toThrow(new NotFoundError('No users found'));
    });

    it('rejects non string filters', async () => {
      for (const filter of [{ username: ['a', 'b'] }, { email: { $ne: '' } }]) {
        await expect(
          new ListUsers(userRepository).execute(filter),
        ).rejects.toThrow(ValidationError);
      }
    });
  });
});
