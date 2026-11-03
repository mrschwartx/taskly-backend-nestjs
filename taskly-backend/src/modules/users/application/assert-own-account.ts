import { AuthenticationError } from '../../../shared/domain/errors.js';

export const assertOwnAccount = (
  requesterId: string,
  userId: unknown,
  message: string,
): void => {
  if (typeof userId !== 'string' || requesterId !== userId.toLowerCase()) {
    throw new AuthenticationError(message);
  }
};
