export const AVATAR_URL_PREFIX = '/images/users/';
export const DEFAULT_AVATAR_PATH = `${AVATAR_URL_PREFIX}default-avatar.jpg`;

const CUSTOM_AVATAR_PATTERN = /^\/images\/users\/avatar-[\w.-]+$/;

export const isCustomAvatar = (avatarPath: unknown): avatarPath is string =>
  typeof avatarPath === 'string' && CUSTOM_AVATAR_PATTERN.test(avatarPath);

export const toAvatarPath = (filename: string): string =>
  `${AVATAR_URL_PREFIX}${filename}`;
