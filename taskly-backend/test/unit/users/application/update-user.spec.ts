import { beforeEach, describe, expect, it } from 'vitest';
import { UpdateUser } from '../../../../src/modules/users/application/use-cases/update-user.js';
import { User } from '../../../../src/modules/users/domain/user.js';
import { Email } from '../../../../src/modules/users/domain/value-objects/email.js';
import { Username } from '../../../../src/modules/users/domain/value-objects/username.js';
import {
  AlreadyExistsError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '../../../../src/shared/domain/errors.js';
import {
  buildUser,
  OTHER_USER_ID,
  USER_ID,
} from '../../../support/builders.js';
import { FakePasswordHasher } from '../../../support/fakes/fake-password-hasher.js';
import { InMemoryUserRepository } from '../../../support/fakes/in-memory-user-repository.js';

describe('UpdateUser', () => {
  let userRepository: InMemoryUserRepository;
  let updateUser: UpdateUser;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    await userRepository.add(buildUser());
    await userRepository.add(
      User.register({
        id: OTHER_USER_ID,
        username: Username.create('jane78'),
        email: Email.create('jane@mail.com'),
        passwordHash: 'hashed:x',
      }),
    );
    updateUser = new UpdateUser(userRepository, new FakePasswordHasher());
  });

  const run = (changes: unknown, overrides: { userId?: string } = {}) =>
    updateUser.execute({
      requesterId: USER_ID,
      userId: USER_ID,
      changes,
      ...overrides,
    });

  it('updates username, email and password', async () => {
    const user = await run({
      username: 'renamed',
      email: 'renamed@mail.com',
      password: 'NewPassword1',
    });

    expect(user.username).toBe('renamed');
    expect(user.email).toBe('renamed@mail.com');
    expect(userRepository.snapshots.get(USER_ID)?.passwordHash).toBe(
      'hashed:NewPassword1',
    );
    expect('passwordHash' in user).toBe(false);
  });

  it('allows an update that keeps the current username and email', async () => {
    const user = await run({
      username: 'johndoe123',
      email: 'johndoe123@mail.com',
    });
    expect(user.username).toBe('johndoe123');
  });

  it('ignores fields that are not updatable', async () => {
    const user = await run({
      username: 'renamed',
      avatar: '/images/users/hacked.png',
      _id: OTHER_USER_ID,
      createdAt: '1999-01-01T00:00:00.000Z',
    });

    const stored = userRepository.snapshots.get(USER_ID);
    expect(user.avatar).toBe('/images/users/default-avatar.jpg');
    expect(stored?.id).toBe(USER_ID);
    expect(stored?.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('rejects updating another account', async () => {
    await expect(
      run({ username: 'hijacked' }, { userId: OTHER_USER_ID }),
    ).rejects.toThrow(
      new AuthenticationError('You can only update your own account'),
    );
    expect(userRepository.snapshots.get(OTHER_USER_ID)?.username).toBe(
      'jane78',
    );
  });

  it('rejects an empty or non updatable payload', async () => {
    for (const changes of [{}, { avatar: 'x.png' }, null, [], 'text']) {
      await expect(run(changes)).rejects.toThrow(ValidationError);
    }
  });

  it('rejects invalid values', async () => {
    await expect(run({ email: 'nope' })).rejects.toThrow(ValidationError);
    await expect(run({ username: 'ab' })).rejects.toThrow(ValidationError);
    await expect(run({ password: 'short' })).rejects.toThrow(ValidationError);
  });

  it('rejects an email or username owned by someone else', async () => {
    await expect(run({ email: 'jane@mail.com' })).rejects.toThrow(
      AlreadyExistsError,
    );
    await expect(run({ username: 'jane78' })).rejects.toThrow(
      AlreadyExistsError,
    );
  });

  it('fails when the account no longer exists', async () => {
    await userRepository.deleteById(USER_ID);
    await expect(run({ username: 'renamed' })).rejects.toThrow(
      new NotFoundError('User not found!'),
    );
  });

  it('accepts a mixed case user id for the owner', async () => {
    const user = await run(
      { username: 'renamed' },
      { userId: USER_ID.toUpperCase() },
    );
    expect(user.username).toBe('renamed');
  });
});
