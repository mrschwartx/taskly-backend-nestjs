import { Injectable } from '@nestjs/common';
import { AlreadyExistsError } from '../../../../shared/domain/errors.js';
import { PasswordHasher } from '../../domain/password-hasher.js';
import { TokenService } from '../../domain/token-service.js';
import { User } from '../../domain/user.js';
import { UserRepository } from '../../domain/user-repository.js';
import { Email } from '../../domain/value-objects/email.js';
import { PlainPassword } from '../../domain/value-objects/plain-password.js';
import { Username } from '../../domain/value-objects/username.js';
import { toUserDto, type UserDto } from '../user-dto.js';

export interface RegisterUserCommand {
  username?: unknown;
  email?: unknown;
  password?: unknown;
}

export interface AuthResult {
  user: UserDto;
  token: string;
}

@Injectable()
export class RegisterUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute({
    username,
    email,
    password,
  }: RegisterUserCommand = {}): Promise<AuthResult> {
    const usernameValue = Username.create(username);
    const emailValue = Email.create(email);
    const passwordValue = PlainPassword.create(password);

    const alreadyRegistered = await this.userRepository.existsByEmailOrUsername(
      {
        email: emailValue.value,
        username: usernameValue.value,
      },
    );
    if (alreadyRegistered) {
      throw new AlreadyExistsError('Email or Username is already registered.');
    }

    const passwordHash = await this.passwordHasher.hash(passwordValue.value);
    const user = User.register({
      id: this.userRepository.nextId(),
      username: usernameValue,
      email: emailValue,
      passwordHash,
    });
    await this.userRepository.add(user);

    return {
      user: toUserDto(user),
      token: this.tokenService.issue({ userId: user.id }),
    };
  }
}
