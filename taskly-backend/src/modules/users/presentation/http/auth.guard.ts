import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { APP_CONFIG } from '../../../../config/config.constants.js';
import type { Config } from '../../../../config/env.js';
import { VerifyAccessToken } from '../../application/use-cases/verify-access-token.js';
import type { AuthenticatedRequest } from './authenticated-request.js';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly cookieName: string;

  constructor(
    private readonly verifyAccessToken: VerifyAccessToken,
    @Inject(APP_CONFIG) config: Config,
  ) {
    this.cookieName = config.auth.cookieName;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { userId } = await this.verifyAccessToken.execute({
      token: request.cookies?.[this.cookieName],
    });
    request.auth = { userId };
    return true;
  }
}
