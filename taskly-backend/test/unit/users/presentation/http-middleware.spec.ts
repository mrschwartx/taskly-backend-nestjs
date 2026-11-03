import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { describe, expect, it } from 'vitest';
import { VerifyAccessToken } from '../../../../src/modules/users/application/use-cases/verify-access-token.js';
import { AuthCookieService } from '../../../../src/modules/users/presentation/http/auth-cookie.service.js';
import { AuthGuard } from '../../../../src/modules/users/presentation/http/auth.guard.js';
import { OwnAccountGuard } from '../../../../src/modules/users/presentation/http/own-account.guard.js';
import {
  AuthenticationError,
  ForbiddenError,
} from '../../../../src/shared/domain/errors.js';
import { FakeTokenService } from '../../../support/fakes/fake-token-service.js';
import { createTestConfig } from '../../../support/test-config.js';

const createResponse = () => {
  const calls: unknown[][] = [];
  const response = {
    calls,
    cookie: (...args: unknown[]) => calls.push(['cookie', ...args]),
    clearCookie: (...args: unknown[]) => calls.push(['clearCookie', ...args]),
  };
  return response as typeof response & Response;
};

const createContext = (request: object): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
  }) as unknown as ExecutionContext;

describe('auth cookie', () => {
  it('uses lax, non secure cookies outside production', () => {
    const response = createResponse();
    new AuthCookieService(createTestConfig()).set(response, 'jwt');

    const [, name, value, options] = response.calls[0];
    expect(name).toBe('taskly_token');
    expect(value).toBe('jwt');
    expect(options).toEqual({
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
      maxAge: 3600000,
    });
  });

  it('uses secure cross site cookies in production', () => {
    const response = createResponse();
    new AuthCookieService(createTestConfig({ APP_LEVEL: 'production' })).set(
      response,
      'jwt',
    );

    const options = response.calls[0][3] as Record<string, unknown>;
    expect(options.sameSite).toBe('none');
    expect(options.secure).toBe(true);
    expect(options.httpOnly).toBe(true);
    expect('domain' in options).toBe(false);
  });

  it('includes the configured domain in production', () => {
    const response = createResponse();
    new AuthCookieService(
      createTestConfig({
        APP_LEVEL: 'production',
        COOKIE_DOMAIN: '.example.com',
      }),
    ).set(response, 'jwt');

    expect((response.calls[0][3] as { domain: string }).domain).toBe(
      '.example.com',
    );
  });

  it('clears the cookie with the same attributes it was set with', () => {
    const response = createResponse();
    new AuthCookieService(
      createTestConfig({
        APP_LEVEL: 'production',
        COOKIE_DOMAIN: '.example.com',
      }),
    ).clear(response);

    const [action, name, options] = response.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(action).toBe('clearCookie');
    expect(name).toBe('taskly_token');
    expect(options.domain).toBe('.example.com');
    expect(options.sameSite).toBe('none');
    expect(options.secure).toBe(true);
  });
});

describe('AuthGuard', () => {
  const guard = new AuthGuard(
    new VerifyAccessToken(new FakeTokenService()),
    createTestConfig(),
  );

  it('attaches the authenticated user to the request', async () => {
    const request: { cookies: object; auth?: unknown } = {
      cookies: { taskly_token: 'token-for-abc' },
    };

    expect(await guard.canActivate(createContext(request))).toBe(true);
    expect(request.auth).toEqual({ userId: 'abc' });
  });

  it('rejects requests without cookies', async () => {
    await expect(guard.canActivate(createContext({}))).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('rejects invalid tokens', async () => {
    await expect(
      guard.canActivate(createContext({ cookies: { taskly_token: 'bad' } })),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('OwnAccountGuard', () => {
  const reflector = { get: () => 'Not yours' } as unknown as Reflector;
  const guard = new OwnAccountGuard(reflector);

  it('continues for the owner', () => {
    expect(
      guard.canActivate(
        createContext({ auth: { userId: 'abc' }, params: { id: 'ABC' } }),
      ),
    ).toBe(true);
  });

  it('throws for any other account', () => {
    expect(() =>
      guard.canActivate(
        createContext({ auth: { userId: 'abc' }, params: { id: 'xyz' } }),
      ),
    ).toThrow(new AuthenticationError('Not yours'));
  });
});
