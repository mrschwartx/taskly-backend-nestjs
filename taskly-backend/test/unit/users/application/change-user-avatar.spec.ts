import { beforeEach, describe, expect, it } from 'vitest';
import { ChangeUserAvatar } from '../../../../src/modules/users/application/use-cases/change-user-avatar.js';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '../../../../src/shared/domain/errors.js';
import {
  buildUser,
  OTHER_USER_ID,
  USER_ID,
} from '../../../support/builders.js';
import { FakeAvatarStorage } from '../../../support/fakes/fake-avatar-storage.js';
import { InMemoryUserRepository } from '../../../support/fakes/in-memory-user-repository.js';

describe('ChangeUserAvatar', () => {
  let userRepository: InMemoryUserRepository;
  let avatarStorage: FakeAvatarStorage;
  let changeUserAvatar: ChangeUserAvatar;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    avatarStorage = new FakeAvatarStorage();
    await userRepository.add(buildUser());
    changeUserAvatar = new ChangeUserAvatar(userRepository, avatarStorage);
  });

  it('stores the new avatar and removes the previous one', async () => {
    const user = await changeUserAvatar.execute({
      requesterId: USER_ID,
      userId: USER_ID,
      avatarPath: '/images/users/avatar-1-2.png',
    });

    expect(user.avatar).toBe('/images/users/avatar-1-2.png');
    expect(userRepository.snapshots.get(USER_ID)?.avatar).toBe(
      '/images/users/avatar-1-2.png',
    );
    expect(avatarStorage.removed).toEqual(['/images/users/default-avatar.jpg']);
  });

  it('cleans up the uploaded file when the account is not the requester', async () => {
    await expect(
      changeUserAvatar.execute({
        requesterId: USER_ID,
        userId: OTHER_USER_ID,
        avatarPath: '/images/users/avatar-9-9.png',
      }),
    ).rejects.toThrow(AuthenticationError);
    expect(avatarStorage.removed).toEqual(['/images/users/avatar-9-9.png']);
  });

  it('cleans up the uploaded file when the user does not exist', async () => {
    await userRepository.deleteById(USER_ID);

    await expect(
      changeUserAvatar.execute({
        requesterId: USER_ID,
        userId: USER_ID,
        avatarPath: '/images/users/avatar-9-9.png',
      }),
    ).rejects.toThrow(NotFoundError);
    expect(avatarStorage.removed).toEqual(['/images/users/avatar-9-9.png']);
  });

  it('rejects requests without a file', async () => {
    await expect(
      changeUserAvatar.execute({ requesterId: USER_ID, userId: USER_ID }),
    ).rejects.toThrow(new ValidationError('No file uploaded'));
    expect(avatarStorage.removed).toEqual([]);
  });
});
