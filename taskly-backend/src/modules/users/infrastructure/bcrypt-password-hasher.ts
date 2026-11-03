import { Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { APP_CONFIG } from '../../../config/config.constants.js';
import type { Config } from '../../../config/env.js';
import { PasswordHasher } from '../domain/password-hasher.js';

@Injectable()
export class BcryptPasswordHasher extends PasswordHasher {
  private readonly rounds: number;

  constructor(@Inject(APP_CONFIG) config: Config) {
    super();
    this.rounds = config.auth.bcryptRounds;
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
