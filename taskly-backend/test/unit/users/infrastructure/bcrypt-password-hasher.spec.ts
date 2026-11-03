import { describe, expect, it } from 'vitest';
import { BcryptPasswordHasher } from '../../../../src/modules/users/infrastructure/bcrypt-password-hasher.js';
import { createTestConfig } from '../../../support/test-config.js';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher(createTestConfig());

  it('produces a salted hash that is not the plain password', async () => {
    const first = await hasher.hash('P@ssword123');
    const second = await hasher.hash('P@ssword123');

    expect(first).not.toBe('P@ssword123');
    expect(first).not.toBe(second);
    expect(first).toMatch(/^\$2[aby]\$04\$/);
  });

  it('verifies the right password only', async () => {
    const hash = await hasher.hash('P@ssword123');

    expect(await hasher.compare('P@ssword123', hash)).toBe(true);
    expect(await hasher.compare('wrong-password', hash)).toBe(false);
  });
});
