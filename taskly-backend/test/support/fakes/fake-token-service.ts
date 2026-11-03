import {
  TokenService,
  type TokenClaims,
} from '../../../src/modules/users/domain/token-service.js';

const PREFIX = 'token-for-';

export class FakeTokenService extends TokenService {
  issue({ userId }: TokenClaims): string {
    return `${PREFIX}${userId}`;
  }

  verify(token: string): TokenClaims {
    if (!token.startsWith(PREFIX)) {
      throw new Error('Invalid token');
    }
    return { userId: token.slice(PREFIX.length) };
  }
}
