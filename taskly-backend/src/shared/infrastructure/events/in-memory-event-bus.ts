import { Injectable } from '@nestjs/common';
import { EventBus, type EventHandler } from '../../application/event-bus.js';
import type { DomainEvent } from '../../domain/domain-event.js';
import { AppLogger } from '../logging/app-logger.js';

@Injectable()
export class InMemoryEventBus extends EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  constructor(private readonly logger: AppLogger) {
    super();
  }

  subscribe(eventName: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventName) ?? [];
    handlers.push(handler);
    this.handlers.set(eventName, handlers);
  }

  async publish(event: DomainEvent<any>): Promise<void> {
    const handlers = this.handlers.get(event.name) ?? [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        const failure = error as Error;
        this.logger.error('Event handler failed', {
          event: event.name,
          message: failure.message,
          stack: failure.stack,
        });
      }
    }
  }
}
