import { Inject, Injectable } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { APP_CONFIG } from '../../../../config/config.constants.js';
import type { Config } from '../../../../config/env.js';

@Injectable()
export class AuthCookieService {
  private readonly auth: Config['auth'];
  private readonly options: CookieOptions;

  constructor(@Inject(APP_CONFIG) config: Config) {
    this.auth = config.auth;
    this.options = {
      httpOnly: true,
      path: '/',
      ...(config.app.isProduction
        ? {
            sameSite: 'none' as const,
            secure: true,
            ...(config.auth.cookieDomain
              ? { domain: config.auth.cookieDomain }
              : {}),
          }
        : { sameSite: 'lax' as const, secure: false }),
    };
  }

  set(response: Response, token: string): void {
    response.cookie(this.auth.cookieName, token, {
      ...this.options,
      maxAge: this.auth.cookieMaxAgeMs,
    });
  }

  clear(response: Response): void {
    response.clearCookie(this.auth.cookieName, this.options);
  }
}
