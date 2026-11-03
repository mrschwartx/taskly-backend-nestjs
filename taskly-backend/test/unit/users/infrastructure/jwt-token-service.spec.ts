import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { JwtTokenService } from '../../../../src/modules/users/infrastructure/jwt-token-service.js';
import { USER_ID } from '../../../support/builders.js';
import {
  createTestConfig,
  TEST_AUTH_SECRET,
} from '../../../support/test-config.js';

describe('JwtTokenService', () => {
  const service = new JwtTokenService(createTestConfig());

  it('issues tokens that verify back to the user id', () => {
    const token = service.issue({ userId: USER_ID });
    expect(service.verify(token)).toEqual({ userId: USER_ID });
  });

  it('issues tokens that expire', () => {
    const payload = jwt.decode(service.issue({ userId: USER_ID })) as {
      exp: number;
      iat: number;
    };
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('rejects tokens signed with another secret', () => {
    const forged = jwt.sign(
      { id: USER_ID },
      'another-secret-another-secret-1234',
    );
    expect(() => service.verify(forged)).toThrow();
  });

  it('rejects tampered tokens', () => {
    const token = service.issue({ userId: USER_ID });
    const [header, , signature] = token.split('.');
    const body = Buffer.from(
      JSON.stringify({ id: 'ffffffff-ffff-ffff-ffff-ffffffffffff' }),
    ).toString('base64url');
    expect(() => service.verify(`${header}.${body}.${signature}`)).toThrow();
  });

  it('rejects expired tokens', () => {
    const expired = jwt.sign({ id: USER_ID }, TEST_AUTH_SECRET, {
      expiresIn: -10,
    });
    expect(() => service.verify(expired)).toThrow(/expired/);
  });

  it('rejects unsigned tokens', () => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    const body = Buffer.from(JSON.stringify({ id: USER_ID })).toString(
      'base64url',
    );
    expect(() => service.verify(`${header}.${body}.`)).toThrow();
  });

  it('rejects tokens signed with an unexpected algorithm', () => {
    const token = jwt.sign({ id: USER_ID }, TEST_AUTH_SECRET, {
      algorithm: 'HS512',
    });
    expect(() => service.verify(token)).toThrow();
  });

  it('rejects tokens whose payload has no valid user id', () => {
    for (const payload of [{}, { id: 'abc' }, { id: 42 }]) {
      const token = jwt.sign(payload, TEST_AUTH_SECRET);
      expect(() => service.verify(token)).toThrow(/Invalid token payload/);
    }
  });
});
