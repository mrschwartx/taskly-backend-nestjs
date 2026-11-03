import { Global, Module } from '@nestjs/common';
import { EventBus } from '../../application/event-bus.js';
import { InMemoryEventBus } from './in-memory-event-bus.js';

@Global()
@Module({
  providers: [{ provide: EventBus, useClass: InMemoryEventBus }],
  exports: [EventBus],
})
export class EventsModule {}
