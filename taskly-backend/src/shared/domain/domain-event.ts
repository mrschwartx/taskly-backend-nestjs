export interface DomainEvent<
  TPayload extends object = Record<string, unknown>,
> {
  readonly name: string;
  readonly payload: Readonly<TPayload>;
  readonly occurredAt: string;
}

export const createDomainEvent = <TPayload extends object>(
  name: string,
  payload: TPayload,
  occurredAt: Date = new Date(),
): DomainEvent<TPayload> =>
  Object.freeze({
    name,
    payload: Object.freeze({ ...payload }),
    occurredAt: occurredAt.toISOString(),
  });
