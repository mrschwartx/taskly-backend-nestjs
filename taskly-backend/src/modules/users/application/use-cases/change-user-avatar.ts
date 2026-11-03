import { Injectable } from '@nestjs/common';
import { parseEntityId } from '../../../../shared/domain/entity-id.js';
import {
  NotFoundError,
  ValidationError,
} from '../../../../shared/domain/errors.js';
import { UserRepository } from '../../domain/user-repository.js';
import { assertOwnAccount } from '../assert-own-account.js';
import { AvatarStorage } from '../avatar-storage.js';
import { toUserDto, type UserDto } from '../user-dto.js';

export interface ChangeUserAvatarCommand {
  requesterId: string;
  userId: unknown;
  avatarPath?: string;
}

@Injectable()
export class ChangeUserAvatar {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly avatarStorage: AvatarStorage,
  ) {}

  async execute({
    requesterId,
    userId,
    avatarPath,
  }: ChangeUserAvatarCommand): Promise<UserDto> {
    try {
      assertOwnAccount(
        requesterId,
        userId,
        'You can only upload an avatar for your own account',
      );
      const id = parseEntityId(userId, 'user');

      if (!avatarPath) {
        throw new ValidationError('No file uploaded');
      }

      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new NotFoundError('User not found!');
      }

      const previousAvatar = user.avatar;
      user.changeAvatar(avatarPath);

      const updated = await this.userRepository.update(user);
      if (!updated) {
        throw new NotFoundError('User not found!');
      }

      await this.avatarStorage.remove(previousAvatar);
      return toUserDto(user);
    } catch (error) {
      if (avatarPath) {
        await this.avatarStorage.remove(avatarPath);
      }
      throw error;
    }
  }
}
