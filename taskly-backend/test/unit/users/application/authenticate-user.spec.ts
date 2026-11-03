import { beforeEach, describe, expect, it } from 'vitest';
import { AuthenticateUser } from '../../../../src/modules/users/application/use-cases/authenticate-user.js';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '../../../../src/shared/domain/errors.js';
import { buildUser } from '../../../support/builders.js';
import { FakePasswordHasher } from '../../../support/fakes/fake-password-hasher.js';
import { FakeTokenService } from '../../../support/fakes/fake-token-service.js';
import { InMemoryUserRepository } from '../../../support/fakes/in-memory-user-repository.js';

describe('AuthenticateUser', () => {
  let authenticateUser: AuthenticateUser;

  beforeEach(async () => {
    const userRepository = new InMemoryUserRepository();
    await userRepository.add(buildUser());
    authenticateUser = new AuthenticateUser(
      userRepository,
      new FakePasswordHasher(),
      new FakeTokenService(),
    );
  });

  it('returns the user and a token for valid credentials', async () => {
    const { user, token } = await authenticateUser.execute({
      email: 'johndoe123@mail.com',
      password: 'password123',
    });

    expect(user.username).toBe('johndoe123');
    expect(token).toBe(`token-for-${user._id}`);
    expect('passwordHash' in user).toBe(false);
  });

  it('trims the email before lookup', async () => {
    const { user } = await authenticateUser.execute({
      email: '  johndoe123@mail.com  ',
      password: 'password123',
    });
    expect(user.email).toBe('johndoe123@mail.com');
  });

  it('fails with not found for an unknown email', async () => {
    await expect(
      authenticateUser.execute({
        email: 'ghost@mail.com',
        password: 'password123',
      }),
    ).rejects.toThrow(new NotFoundError('User not found!'));
  });

  it('fails with authentication error for a wrong password', async () => {
    await expect(
      authenticateUser.execute({
        email: 'johndoe123@mail.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(new AuthenticationError('Wrong password!'));
  });

  it('rejects missing or non string credentials', async () => {
    const invalidInputs = [
      {},
      undefined,
      { email: 'johndoe123@mail.com' },
      { email: { $ne: null }, password: 'password123' },
      { email: 'johndoe123@mail.com', password: { $ne: null } },
    ];
    for (const input of invalidInputs) {
      await expect(authenticateUser.execute(input)).rejects.toThrow(
        ValidationError,
      );
    }
  });
});
