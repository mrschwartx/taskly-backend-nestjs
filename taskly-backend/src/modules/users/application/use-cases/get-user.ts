import { Injectable } from '@nestjs/common';
import { parseEntityId } from '../../../../shared/domain/entity-id.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import { UserRepository } from '../../domain/user-repository.js';
import { toUserDto, type UserDto } from '../user-dto.js';

export interface GetUserQuery {
  userId: unknown;
}

@Injectable()
export class GetUser {
  constructor(private readonly userRepository: UserRepository) {}

  async execute({ userId }: GetUserQuery): Promise<UserDto> {
    const id = parseEntityId(userId, 'user');
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found!');
    }
    return toUserDto(user);
  }
}
