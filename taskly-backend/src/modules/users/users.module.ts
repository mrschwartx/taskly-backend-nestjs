import { Module } from '@nestjs/common';
import { AvatarStorage } from './application/avatar-storage.js';
import { AuthenticateUser } from './application/use-cases/authenticate-user.js';
import { ChangeUserAvatar } from './application/use-cases/change-user-avatar.js';
import { DeleteUser } from './application/use-cases/delete-user.js';
import { GetUser } from './application/use-cases/get-user.js';
import { ListUsers } from './application/use-cases/list-users.js';
import { RegisterUser } from './application/use-cases/register-user.js';
import { UpdateUser } from './application/use-cases/update-user.js';
import { VerifyAccessToken } from './application/use-cases/verify-access-token.js';
import { PasswordHasher } from './domain/password-hasher.js';
import { TokenService } from './domain/token-service.js';
import { UserRepository } from './domain/user-repository.js';
import { BcryptPasswordHasher } from './infrastructure/bcrypt-password-hasher.js';
import { JwtTokenService } from './infrastructure/jwt-token-service.js';
import { LocalAvatarStorage } from './infrastructure/local-avatar-storage.js';
import { PostgresUserRepository } from './infrastructure/postgres-user-repository.js';
import { AuthCookieService } from './presentation/http/auth-cookie.service.js';
import { AuthController } from './presentation/http/auth.controller.js';
import { AuthGuard } from './presentation/http/auth.guard.js';
import { AvatarUploadInterceptor } from './presentation/http/avatar-upload.interceptor.js';
import { OwnAccountGuard } from './presentation/http/own-account.guard.js';
import { UsersController } from './presentation/http/users.controller.js';

@Module({
  controllers: [AuthController, UsersController],
  providers: [
    { provide: UserRepository, useClass: PostgresUserRepository },
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    { provide: TokenService, useClass: JwtTokenService },
    { provide: AvatarStorage, useClass: LocalAvatarStorage },
    RegisterUser,
    AuthenticateUser,
    VerifyAccessToken,
    GetUser,
    ListUsers,
    UpdateUser,
    DeleteUser,
    ChangeUserAvatar,
    AuthCookieService,
    AuthGuard,
    OwnAccountGuard,
    AvatarUploadInterceptor,
  ],
  exports: [AuthGuard, VerifyAccessToken],
})
export class UsersModule {}
