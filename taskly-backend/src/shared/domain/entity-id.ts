import { randomUUID } from 'node:crypto';
import { ValidationError } from './errors.js';

const ENTITY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const generateEntityId = (): string => randomUUID();

export const isEntityId = (value: unknown): value is string =>
  typeof value === 'string' && ENTITY_ID_PATTERN.test(value);

export const parseEntityId = (value: unknown, label: string): string => {
  if (!isEntityId(value)) {
    throw new ValidationError(`Invalid ${label} ID format`);
  }
  return value.toLowerCase();
};
