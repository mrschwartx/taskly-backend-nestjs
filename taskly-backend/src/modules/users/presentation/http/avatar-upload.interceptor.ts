import { randomInt } from 'node:crypto';
import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, RequestHandler, Response } from 'express';
import multer from 'multer';
import type { Observable } from 'rxjs';
import { APP_CONFIG } from '../../../../config/config.constants.js';
import type { Config } from '../../../../config/env.js';
import { ValidationError } from '../../../../shared/domain/errors.js';

const EXTENSION_BY_MIME_TYPE: Readonly<Record<string, string>> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const FIELD_NAME = 'avatar';

@Injectable()
export class AvatarUploadInterceptor implements NestInterceptor {
  private readonly handler: RequestHandler;
  private readonly sizeLimitMessage: string;

  constructor(@Inject(APP_CONFIG) config: Config) {
    const { avatarsDir, avatarMaxBytes } = config.storage;
    this.sizeLimitMessage = `File size exceeds ${avatarMaxBytes / (1024 * 1024)}MB`;
    this.handler = multer({
      storage: multer.diskStorage({
        destination: avatarsDir,
        filename: (_request, file, callback) => {
          const suffix = `${Date.now()}-${randomInt(1_000_000_000)}`;
          callback(
            null,
            `avatar-${suffix}${EXTENSION_BY_MIME_TYPE[file.mimetype]}`,
          );
        },
      }),
      limits: { fileSize: avatarMaxBytes, files: 1 },
      fileFilter: (_request, file, callback) => {
        if (Object.hasOwn(EXTENSION_BY_MIME_TYPE, file.mimetype)) {
          callback(null, true);
          return;
        }
        callback(
          new ValidationError(
            'Only JPEG, PNG, WEBP and GIF images are allowed',
          ),
        );
      },
    }).single(FIELD_NAME);
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    await new Promise<void>((resolve, reject) => {
      this.handler(
        http.getRequest<Request>(),
        http.getResponse<Response>(),
        (error?: unknown) => {
          if (error) {
            reject(this.translate(error));
            return;
          }
          resolve();
        },
      );
    });
    return next.handle();
  }

  private translate(error: unknown): unknown {
    if (error instanceof multer.MulterError) {
      return new ValidationError(
        error.code === 'LIMIT_FILE_SIZE'
          ? this.sizeLimitMessage
          : error.message,
      );
    }
    return error;
  }
}
