import { EventBus } from '../../../src/shared/application/event-bus.js';
import type { DomainEvent } from '../../../src/shared/domain/domain-event.js';

export class RecordingEventBus extends EventBus {
  events: DomainEvent<any>[] = [];

  async publish(event: DomainEvent<any>): Promise<void> {
    this.events.push(event);
  }

  subscribe(): void {}
}
