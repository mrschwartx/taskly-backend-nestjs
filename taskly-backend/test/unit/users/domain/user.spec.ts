import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AVATAR_PATH,
  isCustomAvatar,
  toAvatarPath,
} from '../../../../src/modules/users/domain/avatar.js';
import { User } from '../../../../src/modules/users/domain/user.js';
import { Email } from '../../../../src/modules/users/domain/value-objects/email.js';
import { Username } from '../../../../src/modules/users/domain/value-objects/username.js';
import { buildUser, USER_ID } from '../../../support/builders.js';

describe('User', () => {
  it('registers with the default avatar and equal timestamps', () => {
    const user = buildUser();

    expect(user.id).toBe(USER_ID);
    expect(user.username.value).toBe('johndoe123');
    expect(user.email.value).toBe('johndoe123@mail.com');
    expect(user.avatar).toBe(DEFAULT_AVATAR_PATH);
    expect(user.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(user.updatedAt).toBe(user.createdAt);
  });

  it('updates only the provided profile fields and touches updatedAt', () => {
    const user = buildUser();

    user.updateProfile(
      { email: Email.create('new@mail.com') },
      new Date('2026-02-02T00:00:00.000Z'),
    );

    expect(user.email.value).toBe('new@mail.com');
    expect(user.username.value).toBe('johndoe123');
    expect(user.passwordHash).toBe('hashed:password123');
    expect(user.updatedAt).toBe('2026-02-02T00:00:00.000Z');
    expect(user.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('can change username and password hash', () => {
    const user = buildUser();
    user.updateProfile({
      username: Username.create('renamed'),
      passwordHash: 'hashed:other',
    });
    expect(user.username.value).toBe('renamed');
    expect(user.passwordHash).toBe('hashed:other');
  });

  it('changes the avatar', () => {
    const user = buildUser();
    user.changeAvatar(
      '/images/users/avatar-1-2.png',
      new Date('2026-03-03T00:00:00.000Z'),
    );
    expect(user.avatar).toBe('/images/users/avatar-1-2.png');
    expect(user.updatedAt).toBe('2026-03-03T00:00:00.000Z');
  });

  it('round trips through snapshots', () => {
    const user = buildUser();
    const restored = User.restore(user.toSnapshot());
    expect(restored.toSnapshot()).toEqual(user.toSnapshot());
  });

  it('restores legacy data that would fail current validation', () => {
    const restored = User.restore({
      ...buildUser().toSnapshot(),
      username: 'ab',
      email: 'legacy',
    });
    expect(restored.username.value).toBe('ab');
  });
});

describe('avatar helpers', () => {
  it('recognizes only uploaded avatars as custom', () => {
    expect(
      isCustomAvatar('/images/users/avatar-1733654028168-119000846.jpeg'),
    ).toBe(true);
    expect(isCustomAvatar(DEFAULT_AVATAR_PATH)).toBe(false);
    expect(isCustomAvatar('/images/users/../../etc/passwd')).toBe(false);
    expect(isCustomAvatar('/images/users/avatar-1/../../x')).toBe(false);
    expect(isCustomAvatar(undefined)).toBe(false);
  });

  it('builds public paths from filenames', () => {
    expect(toAvatarPath('avatar-1-2.png')).toBe('/images/users/avatar-1-2.png');
  });
});
