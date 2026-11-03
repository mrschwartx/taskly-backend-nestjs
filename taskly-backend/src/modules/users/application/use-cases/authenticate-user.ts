import { Injectable } from '@nestjs/common';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors.js';
import { PasswordHasher } from '../../domain/password-hasher.js';
import { TokenService } from '../../domain/token-service.js';
import { UserRepository } from '../../domain/user-repository.js';
import { toUserDto } from '../user-dto.js';
import type { AuthResult } from './register-user.js';

export interface AuthenticateUserCommand {
  email?: unknown;
  password?: unknown;
}

@Injectable()
export class AuthenticateUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute({
    email,
    password,
  }: AuthenticateUserCommand = {}): Promise<AuthResult> {
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new ValidationError('Email and password are required');
    }

    const user = await this.userRepository.findByEmail(email.trim());
    if (!user) {
      throw new NotFoundError('User not found!');
    }

    const passwordMatches = await this.passwordHasher.compare(
      password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new AuthenticationError('Wrong password!');
    }

    return {
      user: toUserDto(user),
      token: this.tokenService.issue({ userId: user.id }),
    };
  }
}
