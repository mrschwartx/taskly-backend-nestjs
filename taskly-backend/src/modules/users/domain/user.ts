import { DEFAULT_AVATAR_PATH } from './avatar.js';
import { Email } from './value-objects/email.js';
import { Username } from './value-objects/username.js';

export interface UserSnapshot {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewUser {
  id: string;
  username: Username;
  email: Email;
  passwordHash: string;
  now?: Date;
}

export interface ProfileChanges {
  username?: Username;
  email?: Email;
  passwordHash?: string;
}

export class User {
  private constructor(
    private readonly _id: string,
    private _username: Username,
    private _email: Email,
    private _passwordHash: string,
    private _avatar: string,
    private readonly _createdAt: string,
    private _updatedAt: string,
  ) {}

  static register({
    id,
    username,
    email,
    passwordHash,
    now = new Date(),
  }: NewUser): User {
    const timestamp = now.toISOString();
    return new User(
      id,
      username,
      email,
      passwordHash,
      DEFAULT_AVATAR_PATH,
      timestamp,
      timestamp,
    );
  }

  static restore(snapshot: UserSnapshot): User {
    return new User(
      snapshot.id,
      Username.restore(snapshot.username),
      Email.restore(snapshot.email),
      snapshot.passwordHash,
      snapshot.avatar,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  get id(): string {
    return this._id;
  }

  get username(): Username {
    return this._username;
  }

  get email(): Email {
    return this._email;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get avatar(): string {
    return this._avatar;
  }

  get createdAt(): string {
    return this._createdAt;
  }

  get updatedAt(): string {
    return this._updatedAt;
  }

  updateProfile(
    { username, email, passwordHash }: ProfileChanges,
    now: Date = new Date(),
  ): void {
    if (username) {
      this._username = username;
    }
    if (email) {
      this._email = email;
    }
    if (passwordHash) {
      this._passwordHash = passwordHash;
    }
    this.touch(now);
  }

  changeAvatar(avatar: string, now: Date = new Date()): void {
    this._avatar = avatar;
    this.touch(now);
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this._id,
      username: this._username.value,
      email: this._email.value,
      passwordHash: this._passwordHash,
      avatar: this._avatar,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private touch(now: Date): void {
    this._updatedAt = now.toISOString();
  }
}
