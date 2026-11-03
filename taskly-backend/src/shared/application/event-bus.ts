import type { DomainEvent } from '../domain/domain-event.js';

export type EventHandler = (event: DomainEvent<any>) => unknown;

export abstract class EventBus {
  abstract publish(event: DomainEvent<any>): Promise<void>;
  abstract subscribe(eventName: string, handler: EventHandler): void;
}
