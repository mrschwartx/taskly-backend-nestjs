import { Injectable } from '@nestjs/common';
import {
  AuthenticationError,
  ForbiddenError,
} from '../../../../shared/domain/errors.js';
import { TokenService, type TokenClaims } from '../../domain/token-service.js';

export interface VerifyAccessTokenCommand {
  token?: string;
}

@Injectable()
export class VerifyAccessToken {
  constructor(private readonly tokenService: TokenService) {}

  async execute({
    token,
  }: VerifyAccessTokenCommand = {}): Promise<TokenClaims> {
    if (!token) {
      throw new AuthenticationError('Unauthorized: Token not provided');
    }

    try {
      return this.tokenService.verify(token);
    } catch {
      throw new ForbiddenError('Forbidden: Invalid token');
    }
  }
}
