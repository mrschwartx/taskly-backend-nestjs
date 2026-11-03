import type { LoggerService } from '@nestjs/common';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { Config } from '../../../config/env.js';

export type LogMeta = Record<string, unknown>;

const isMeta = (value: unknown): value is LogMeta =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const buildTransports = ({
  app,
  logging,
}: Pick<Config, 'app' | 'logging'>): winston.transport[] => {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: app.isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple(),
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
    }),
  ];

  if (logging.toFile && !logging.silent) {
    transports.push(
      new DailyRotateFile({
        dirname: logging.dir,
        filename: `${app.name}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
      }),
    );
  }

  return transports;
};

export class AppLogger implements LoggerService {
  private readonly winston: winston.Logger;

  constructor(config: Pick<Config, 'app' | 'logging'>) {
    this.winston = winston.createLogger({
      level: config.logging.level,
      silent: config.logging.silent,
      defaultMeta: { service: config.app.name },
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: buildTransports(config),
    });
  }

  debug(message: unknown, meta?: LogMeta): void {
    this.winston.debug(String(message), meta);
  }

  info(message: unknown, meta?: LogMeta): void {
    this.winston.info(String(message), meta);
  }

  warn(message: unknown, meta?: LogMeta): void {
    this.winston.warn(String(message), meta);
  }

  error(message: unknown, meta?: LogMeta): void {
    this.winston.error(String(message), meta);
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.winston.info(String(message), this.contextMeta(optionalParams));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.winston.verbose(String(message), this.contextMeta(optionalParams));
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.winston.error(String(message), this.contextMeta(optionalParams));
  }

  close(): void {
    this.winston.close();
  }

  private contextMeta(params: unknown[]): LogMeta | undefined {
    const [first] = params;
    if (isMeta(first)) {
      return first;
    }
    return typeof first === 'string' ? { context: first } : undefined;
  }
}
