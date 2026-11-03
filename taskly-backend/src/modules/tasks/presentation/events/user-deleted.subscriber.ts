import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EventBus } from '../../../../shared/application/event-bus.js';
import type { DomainEvent } from '../../../../shared/domain/domain-event.js';
import {
  USER_DELETED,
  type UserDeletedPayload,
} from '../../../../shared/domain/integration-events.js';
import { DeleteTasksByOwner } from '../../application/use-cases/delete-tasks-by-owner.js';

@Injectable()
export class UserDeletedSubscriber implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBus,
    private readonly deleteTasksByOwner: DeleteTasksByOwner,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe(
      USER_DELETED,
      ({ payload }: DomainEvent<UserDeletedPayload>) =>
        this.deleteTasksByOwner.execute({ ownerId: payload.userId }),
    );
  }
}
