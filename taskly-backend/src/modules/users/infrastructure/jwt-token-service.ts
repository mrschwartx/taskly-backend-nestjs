import { Inject, Injectable } from '@nestjs/common';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { APP_CONFIG } from '../../../config/config.constants.js';
import type { Config } from '../../../config/env.js';
import { isEntityId } from '../../../shared/domain/entity-id.js';
import { TokenService, type TokenClaims } from '../domain/token-service.js';

const ALGORITHM = 'HS256';

@Injectable()
export class JwtTokenService extends TokenService {
  private readonly secret: string;
  private readonly ttl: SignOptions['expiresIn'];

  constructor(@Inject(APP_CONFIG) config: Config) {
    super();
    this.secret = config.auth.secret;
    this.ttl = config.auth.tokenTtl as SignOptions['expiresIn'];
  }

  issue({ userId }: TokenClaims): string {
    return jwt.sign({ id: userId }, this.secret, {
      algorithm: ALGORITHM,
      expiresIn: this.ttl,
    });
  }

  verify(token: string): TokenClaims {
    const payload = jwt.verify(token, this.secret, {
      algorithms: [ALGORITHM],
    }) as { id?: unknown };
    if (!isEntityId(payload?.id)) {
      throw new Error('Invalid token payload');
    }
    return { userId: payload.id.toLowerCase() };
  }
}
