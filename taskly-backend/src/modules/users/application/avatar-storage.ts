export abstract class AvatarStorage {
  abstract remove(avatarPath: string): Promise<void>;
}
