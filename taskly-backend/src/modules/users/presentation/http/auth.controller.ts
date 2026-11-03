import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { UserDto } from '../../application/user-dto.js';
import { AuthenticateUser } from '../../application/use-cases/authenticate-user.js';
import { RegisterUser } from '../../application/use-cases/register-user.js';
import { AuthCookieService } from './auth-cookie.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly authenticateUser: AuthenticateUser,
    private readonly authCookie: AuthCookieService,
  ) {}

  @Post('signup')
  @HttpCode(200)
  async signUp(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserDto> {
    const { user, token } = await this.registerUser.execute(
      (body ?? {}) as Record<string, unknown>,
    );
    this.authCookie.set(response, token);
    return user;
  }

  @Post('signin')
  @HttpCode(200)
  async signIn(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserDto> {
    const { user, token } = await this.authenticateUser.execute(
      (body ?? {}) as Record<string, unknown>,
    );
    this.authCookie.set(response, token);
    return user;
  }

  @Get('signout')
  signOut(@Res({ passthrough: true }) response: Response): {
    message: string;
  } {
    this.authCookie.clear(response);
    return { message: 'Sign out successful' };
  }
}
