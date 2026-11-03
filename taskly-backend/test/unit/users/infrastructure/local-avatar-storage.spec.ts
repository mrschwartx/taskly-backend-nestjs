import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LocalAvatarStorage } from '../../../../src/modules/users/infrastructure/local-avatar-storage.js';
import { createSpyLogger } from '../../../support/silent-logger.js';
import {
  createTempPublicDir,
  createTestConfig,
  removeDir,
} from '../../../support/test-config.js';

describe('LocalAvatarStorage', () => {
  let publicDir: string;
  let avatarsDir: string;
  let logger: ReturnType<typeof createSpyLogger>;
  let storage: LocalAvatarStorage;

  beforeAll(() => {
    publicDir = createTempPublicDir();
    avatarsDir = path.join(publicDir, 'images', 'users');
    logger = createSpyLogger();
    storage = new LocalAvatarStorage(
      createTestConfig({ PUBLIC_DIR: publicDir }),
      logger,
    );
  });

  afterAll(() => removeDir(publicDir));

  it('removes uploaded avatar files', async () => {
    const file = path.join(avatarsDir, 'avatar-1-2.png');
    fs.writeFileSync(file, 'data');

    await storage.remove('/images/users/avatar-1-2.png');

    expect(fs.existsSync(file)).toBe(false);
  });

  it('never removes the default avatar', async () => {
    await storage.remove('/images/users/default-avatar.jpg');
    expect(fs.existsSync(path.join(avatarsDir, 'default-avatar.jpg'))).toBe(
      true,
    );
  });

  it('ignores paths that are not uploaded avatars', async () => {
    const outside = path.join(publicDir, 'secret.txt');
    fs.writeFileSync(outside, 'secret');

    await storage.remove('/../secret.txt');
    await storage.remove('/images/users/../../secret.txt');
    await storage.remove(undefined as never);

    expect(fs.existsSync(outside)).toBe(true);
  });

  it('does not fail when the file is already gone', async () => {
    await expect(
      storage.remove('/images/users/avatar-missing-0.png'),
    ).resolves.toBeUndefined();
  });

  it('logs a warning instead of throwing when removal fails', async () => {
    fs.mkdirSync(path.join(avatarsDir, 'avatar-directory-1'));

    await expect(
      storage.remove('/images/users/avatar-directory-1'),
    ).resolves.toBeUndefined();

    expect(logger.entries.some((entry) => entry.level === 'warn')).toBe(true);
  });
});
