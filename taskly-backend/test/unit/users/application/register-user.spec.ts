import { beforeEach, describe, expect, it } from 'vitest';
import { RegisterUser } from '../../../../src/modules/users/application/use-cases/register-user.js';
import {
  AlreadyExistsError,
  ValidationError,
} from '../../../../src/shared/domain/errors.js';
import { FakePasswordHasher } from '../../../support/fakes/fake-password-hasher.js';
import { FakeTokenService } from '../../../support/fakes/fake-token-service.js';
import { InMemoryUserRepository } from '../../../support/fakes/in-memory-user-repository.js';

describe('RegisterUser', () => {
  let userRepository: InMemoryUserRepository;
  let registerUser: RegisterUser;

  const validInput = {
    username: 'johndoe123',
    email: 'johndoe123@mail.com',
    password: 'P@ssword123',
  };

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    registerUser = new RegisterUser(
      userRepository,
      new FakePasswordHasher(),
      new FakeTokenService(),
    );
  });

  it('registers a user and returns a public view with a token', async () => {
    const { user, token } = await registerUser.execute(validInput);

    expect(user.username).toBe('johndoe123');
    expect(user.email).toBe('johndoe123@mail.com');
    expect(user.avatar).toBe('/images/users/default-avatar.jpg');
    expect(user._id).toMatch(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
    expect(token).toBe(`token-for-${user._id}`);
    expect('password' in user).toBe(false);
    expect('passwordHash' in user).toBe(false);
  });

  it('stores only the hashed password', async () => {
    const { user } = await registerUser.execute(validInput);
    const stored = userRepository.snapshots.get(user._id);

    expect(stored?.passwordHash).toBe('hashed:P@ssword123');
    expect(stored?.passwordHash).not.toBe(validInput.password);
  });

  it('rejects an already registered email', async () => {
    await registerUser.execute(validInput);

    await expect(
      registerUser.execute({ ...validInput, username: 'someoneelse' }),
    ).rejects.toThrow(
      new AlreadyExistsError('Email or Username is already registered.'),
    );
  });

  it('rejects an already registered username', async () => {
    await registerUser.execute(validInput);

    await expect(
      registerUser.execute({ ...validInput, email: 'other@mail.com' }),
    ).rejects.toThrow(AlreadyExistsError);
  });

  it('rejects invalid input without persisting anything', async () => {
    const invalidInputs = [
      { ...validInput, email: 'not-an-email' },
      { ...validInput, username: 'ab' },
      { ...validInput, password: 'short' },
      { ...validInput, password: undefined },
      { email: validInput.email },
      undefined,
    ];

    for (const input of invalidInputs) {
      await expect(registerUser.execute(input)).rejects.toThrow(
        ValidationError,
      );
    }
    expect(userRepository.snapshots.size).toBe(0);
  });

  it('rejects operator objects posing as strings', async () => {
    await expect(
      registerUser.execute({ ...validInput, email: { $ne: null } }),
    ).rejects.toThrow(ValidationError);
  });
});
