import { beforeEach, describe, expect, it } from 'vitest';
import { DeleteUser } from '../../../../src/modules/users/application/use-cases/delete-user.js';
import {
  AuthenticationError,
  NotFoundError,
} from '../../../../src/shared/domain/errors.js';
import { USER_DELETED } from '../../../../src/shared/domain/integration-events.js';
import {
  buildUser,
  OTHER_USER_ID,
  USER_ID,
} from '../../../support/builders.js';
import { FakeAvatarStorage } from '../../../support/fakes/fake-avatar-storage.js';
import { InMemoryUserRepository } from '../../../support/fakes/in-memory-user-repository.js';
import { RecordingEventBus } from '../../../support/fakes/recording-event-bus.js';

describe('DeleteUser', () => {
  let userRepository: InMemoryUserRepository;
  let avatarStorage: FakeAvatarStorage;
  let eventBus: RecordingEventBus;
  let deleteUser: DeleteUser;

  beforeEach(async () => {
    userRepository = new InMemoryUserRepository();
    avatarStorage = new FakeAvatarStorage();
    eventBus = new RecordingEventBus();
    const user = buildUser();
    user.changeAvatar('/images/users/avatar-1-2.png');
    await userRepository.add(user);
    deleteUser = new DeleteUser(userRepository, avatarStorage, eventBus);
  });

  it('deletes the user, removes the avatar and publishes an event', async () => {
    await deleteUser.execute({ requesterId: USER_ID, userId: USER_ID });

    expect(userRepository.snapshots.has(USER_ID)).toBe(false);
    expect(avatarStorage.removed).toEqual(['/images/users/avatar-1-2.png']);
    expect(eventBus.events).toHaveLength(1);
    expect(eventBus.events[0].name).toBe(USER_DELETED);
    expect(eventBus.events[0].payload.userId).toBe(USER_ID);
  });

  it('rejects deleting another account', async () => {
    await expect(
      deleteUser.execute({ requesterId: USER_ID, userId: OTHER_USER_ID }),
    ).rejects.toThrow(
      new AuthenticationError('You can only delete your own account'),
    );
    expect(userRepository.snapshots.size).toBe(1);
    expect(eventBus.events).toHaveLength(0);
  });

  it('fails when the user does not exist', async () => {
    await userRepository.deleteById(USER_ID);

    await expect(
      deleteUser.execute({ requesterId: USER_ID, userId: USER_ID }),
    ).rejects.toThrow(NotFoundError);
    expect(eventBus.events).toHaveLength(0);
  });
});
