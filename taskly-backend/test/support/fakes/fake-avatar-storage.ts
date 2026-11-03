import { AvatarStorage } from '../../../src/modules/users/application/avatar-storage.js';

export class FakeAvatarStorage extends AvatarStorage {
  removed: string[] = [];

  async remove(avatarPath: string): Promise<void> {
    this.removed.push(avatarPath);
  }
}
