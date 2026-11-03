import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { assertOwnAccount } from '../../application/assert-own-account.js';
import type { AuthenticatedRequest } from './authenticated-request.js';

const OWN_ACCOUNT_MESSAGE = 'own-account-message';

export const OwnAccount = (message: string) =>
  SetMetadata(OWN_ACCOUNT_MESSAGE, message);

@Injectable()
export class OwnAccountGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const message = this.reflector.get<string>(
      OWN_ACCOUNT_MESSAGE,
      context.getHandler(),
    );
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    assertOwnAccount(request.auth.userId, request.params.id, message);
    return true;
  }
}
