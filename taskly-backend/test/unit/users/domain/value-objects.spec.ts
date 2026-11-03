import { describe, expect, it } from 'vitest';
import { Email } from '../../../../src/modules/users/domain/value-objects/email.js';
import { PlainPassword } from '../../../../src/modules/users/domain/value-objects/plain-password.js';
import { Username } from '../../../../src/modules/users/domain/value-objects/username.js';
import { ValidationError } from '../../../../src/shared/domain/errors.js';

describe('Email', () => {
  it('trims and keeps the casing', () => {
    expect(Email.create('  John@Mail.com ').value).toBe('John@Mail.com');
  });

  it('rejects invalid values', () => {
    const invalid = ['', 'plain', 'a@b', '@mail.com', 'a b@mail.com', 42];
    for (const value of [...invalid, undefined]) {
      expect(() => Email.create(value)).toThrow(ValidationError);
    }
  });

  it('rejects overly long addresses', () => {
    expect(() => Email.create(`${'a'.repeat(250)}@mail.com`)).toThrow(
      ValidationError,
    );
  });

  it('compares by value', () => {
    expect(Email.create('a@mail.com').equals(Email.create('a@mail.com'))).toBe(
      true,
    );
    expect(Email.create('a@mail.com').equals(Email.create('b@mail.com'))).toBe(
      false,
    );
    expect(Email.create('a@mail.com').equals('a@mail.com')).toBe(false);
  });

  it('restores stored values without validation', () => {
    expect(Email.restore('legacy').value).toBe('legacy');
  });
});

describe('Username', () => {
  it('trims valid usernames', () => {
    expect(Username.create('  johndoe123 ').value).toBe('johndoe123');
  });

  it('enforces length boundaries', () => {
    expect(Username.create('abc').value).toBe('abc');
    expect(Username.create('a'.repeat(50)).value).toHaveLength(50);
    expect(() => Username.create('ab')).toThrow(ValidationError);
    expect(() => Username.create('a'.repeat(51))).toThrow(ValidationError);
  });

  it('rejects non strings', () => {
    expect(() => Username.create(undefined)).toThrow(ValidationError);
    expect(() => Username.create({ $ne: null })).toThrow(ValidationError);
  });

  it('compares by value', () => {
    expect(Username.create('johndoe').equals(Username.create('johndoe'))).toBe(
      true,
    );
    expect(Username.create('johndoe').equals(Username.create('janedoe'))).toBe(
      false,
    );
  });
});

describe('PlainPassword', () => {
  it('accepts passwords within bounds', () => {
    expect(PlainPassword.create('P@ssword123').value).toBe('P@ssword123');
  });

  it('rejects short passwords', () => {
    expect(() => PlainPassword.create('short')).toThrow(/at least 8/);
  });

  it('rejects passwords above the bcrypt limit in bytes', () => {
    expect(() => PlainPassword.create('a'.repeat(73))).toThrow(/72 bytes/);
    expect(() => PlainPassword.create('é'.repeat(37))).toThrow(/72 bytes/);
  });

  it('rejects non strings', () => {
    expect(() => PlainPassword.create(12345678)).toThrow(ValidationError);
    expect(() => PlainPassword.create(undefined)).toThrow(ValidationError);
  });
});
