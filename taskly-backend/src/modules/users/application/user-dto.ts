import type { User } from '../domain/user.js';

export interface UserDto {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

export const toUserDto = (user: User): UserDto => ({
  _id: user.id,
  username: user.username.value,
  email: user.email.value,
  avatar: user.avatar,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
