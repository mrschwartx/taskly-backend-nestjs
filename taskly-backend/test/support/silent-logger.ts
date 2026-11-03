import { AppLogger } from '../../src/shared/infrastructure/logging/app-logger.js';
import { createTestConfig } from './test-config.js';

export interface LogEntry {
  level: string;
  message: unknown;
  meta: unknown;
}

export const createSilentLogger = (): AppLogger =>
  new AppLogger(createTestConfig());

export const createSpyLogger = () => {
  const entries: LogEntry[] = [];
  const record =
    (level: string) =>
    (message: unknown, meta?: unknown): void => {
      entries.push({ level, message, meta });
    };
  const logger = {
    entries,
    debug: record('debug'),
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
  };
  return logger as typeof logger & AppLogger;
};
