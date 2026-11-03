import { Injectable } from '@nestjs/common';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors.js';
import { UserRepository } from '../../domain/user-repository.js';
import { toUserDto, type UserDto } from '../user-dto.js';

const optionalString = (value: unknown, label: string): string | undefined => {
  if (value !== undefined && typeof value !== 'string') {
    throw new ValidationError(`${label} filter must be a string`);
  }
  return value;
};

export interface ListUsersQuery {
  username?: unknown;
  email?: unknown;
}

@Injectable()
export class ListUsers {
  constructor(private readonly userRepository: UserRepository) {}

  async execute({ username, email }: ListUsersQuery = {}): Promise<UserDto[]> {
    const criteria = {
      username: optionalString(username, 'Username'),
      email: optionalString(email, 'Email'),
    };

    const users = await this.userRepository.search(criteria);
    if (users.length === 0) {
      throw new NotFoundError('No users found');
    }
    return users.map(toUserDto);
  }
}
