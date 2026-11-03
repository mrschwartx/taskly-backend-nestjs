import { describe, expect, it } from 'vitest';
import {
  createDomainEvent,
  type DomainEvent,
} from '../../../src/shared/domain/domain-event.js';
import { InMemoryEventBus } from '../../../src/shared/infrastructure/events/in-memory-event-bus.js';
import { createSpyLogger } from '../../support/silent-logger.js';

describe('InMemoryEventBus', () => {
  it('delivers events to subscribed handlers in order', async () => {
    const bus = new InMemoryEventBus(createSpyLogger());
    const calls: string[] = [];
    bus.subscribe('thing.happened', async () => calls.push('first'));
    bus.subscribe('thing.happened', async () => calls.push('second'));

    await bus.publish(createDomainEvent('thing.happened', { id: 1 }));

    expect(calls).toEqual(['first', 'second']);
  });

  it('passes the event to handlers', async () => {
    const bus = new InMemoryEventBus(createSpyLogger());
    let received: DomainEvent<any> | undefined;
    bus.subscribe('thing.happened', (event) => {
      received = event;
    });

    await bus.publish(createDomainEvent('thing.happened', { id: 42 }));

    expect(received?.name).toBe('thing.happened');
    expect(received?.payload.id).toBe(42);
    expect(received?.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('ignores events without subscribers', async () => {
    const bus = new InMemoryEventBus(createSpyLogger());
    await expect(
      bus.publish(createDomainEvent('unknown.event', {})),
    ).resolves.toBeUndefined();
  });

  it('isolates handler failures and keeps delivering', async () => {
    const logger = createSpyLogger();
    const bus = new InMemoryEventBus(logger);
    const calls: string[] = [];
    bus.subscribe('thing.happened', async () => {
      throw new Error('handler exploded');
    });
    bus.subscribe('thing.happened', async () => calls.push('survivor'));

    await bus.publish(createDomainEvent('thing.happened', {}));

    expect(calls).toEqual(['survivor']);
    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0].level).toBe('error');
    expect((logger.entries[0].meta as { message: string }).message).toBe(
      'handler exploded',
    );
  });

  it('creates immutable domain events', () => {
    const event = createDomainEvent('thing.happened', { id: 1 });
    expect(() => {
      (event.payload as { id: number }).id = 2;
    }).toThrow(TypeError);
  });
});
