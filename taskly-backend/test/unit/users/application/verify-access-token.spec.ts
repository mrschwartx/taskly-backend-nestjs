import { describe, expect, it } from 'vitest';
import { VerifyAccessToken } from '../../../../src/modules/users/application/use-cases/verify-access-token.js';
import {
  AuthenticationError,
  ForbiddenError,
} from '../../../../src/shared/domain/errors.js';
import { FakeTokenService } from '../../../support/fakes/fake-token-service.js';

describe('VerifyAccessToken', () => {
  const verifyAccessToken = new VerifyAccessToken(new FakeTokenService());

  it('returns the user id for a valid token', async () => {
    const result = await verifyAccessToken.execute({ token: 'token-for-abc' });
    expect(result).toEqual({ userId: 'abc' });
  });

  it('fails with authentication error when the token is missing', async () => {
    for (const input of [{}, undefined, { token: '' }]) {
      await expect(verifyAccessToken.execute(input)).rejects.toThrow(
        new AuthenticationError('Unauthorized: Token not provided'),
      );
    }
  });

  it('fails with forbidden for an invalid token', async () => {
    await expect(
      verifyAccessToken.execute({ token: 'garbage' }),
    ).rejects.toThrow(new ForbiddenError('Forbidden: Invalid token'));
  });
});
