import { Injectable } from '@nestjs/common';
import { EventBus } from '../../../../shared/application/event-bus.js';
import { createDomainEvent } from '../../../../shared/domain/domain-event.js';
import { parseEntityId } from '../../../../shared/domain/entity-id.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import {
  USER_DELETED,
  type UserDeletedPayload,
} from '../../../../shared/domain/integration-events.js';
import { UserRepository } from '../../domain/user-repository.js';
import { assertOwnAccount } from '../assert-own-account.js';
import { AvatarStorage } from '../avatar-storage.js';

export interface DeleteUserCommand {
  requesterId: string;
  userId: unknown;
}

@Injectable()
export class DeleteUser {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly avatarStorage: AvatarStorage,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ requesterId, userId }: DeleteUserCommand): Promise<void> {
    assertOwnAccount(
      requesterId,
      userId,
      'You can only delete your own account',
    );
    const id = parseEntityId(userId, 'user');

    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found!');
    }

    const deleted = await this.userRepository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError('User not found!');
    }

    await this.avatarStorage.remove(user.avatar);
    await this.eventBus.publish(
      createDomainEvent<UserDeletedPayload>(USER_DELETED, { userId: id }),
    );
  }
}
