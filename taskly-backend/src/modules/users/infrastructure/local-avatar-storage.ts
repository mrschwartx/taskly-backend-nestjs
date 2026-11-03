import fs from 'node:fs/promises';
import path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../../../config/config.constants.js';
import type { Config } from '../../../config/env.js';
import { AppLogger } from '../../../shared/infrastructure/logging/app-logger.js';
import { AvatarStorage } from '../application/avatar-storage.js';
import { isCustomAvatar } from '../domain/avatar.js';

@Injectable()
export class LocalAvatarStorage extends AvatarStorage {
  private readonly publicDir: string;

  constructor(
    @Inject(APP_CONFIG) config: Config,
    private readonly logger: AppLogger,
  ) {
    super();
    this.publicDir = config.storage.publicDir;
  }

  async remove(avatarPath: string): Promise<void> {
    if (!isCustomAvatar(avatarPath)) {
      return;
    }

    try {
      await fs.rm(path.join(this.publicDir, avatarPath), { force: true });
    } catch (error) {
      this.logger.warn('Failed to remove avatar file', {
        avatarPath,
        message: (error as Error).message,
      });
    }
  }
}
