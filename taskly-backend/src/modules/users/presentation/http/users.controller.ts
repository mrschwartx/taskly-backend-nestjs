import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChangeUserAvatar } from '../../application/use-cases/change-user-avatar.js';
import { DeleteUser } from '../../application/use-cases/delete-user.js';
import { GetUser } from '../../application/use-cases/get-user.js';
import { ListUsers } from '../../application/use-cases/list-users.js';
import { UpdateUser } from '../../application/use-cases/update-user.js';
import type { UserDto } from '../../application/user-dto.js';
import { toAvatarPath } from '../../domain/avatar.js';
import { AuthCookieService } from './auth-cookie.service.js';
import { AuthGuard } from './auth.guard.js';
import { AvatarUploadInterceptor } from './avatar-upload.interceptor.js';
import { OwnAccount, OwnAccountGuard } from './own-account.guard.js';
import { RequesterId } from './requester-id.decorator.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(
    private readonly getUser: GetUser,
    private readonly listUsers: ListUsers,
    private readonly updateUser: UpdateUser,
    private readonly deleteUser: DeleteUser,
    private readonly changeUserAvatar: ChangeUserAvatar,
    private readonly authCookie: AuthCookieService,
  ) {}

  @Get()
  getUsers(
    @Query('username') username: unknown,
    @Query('email') email: unknown,
  ): Promise<UserDto[]> {
    return this.listUsers.execute({ username, email });
  }

  @Get(':id')
  getOne(@Param('id') userId: string): Promise<UserDto> {
    return this.getUser.execute({ userId });
  }

  @Patch('update/:id')
  update(
    @RequesterId() requesterId: string,
    @Param('id') userId: string,
    @Body() body: unknown,
  ): Promise<UserDto> {
    return this.updateUser.execute({ requesterId, userId, changes: body });
  }

  @Post('upload/:id')
  @HttpCode(200)
  @OwnAccount('You can only upload an avatar for your own account')
  @UseGuards(OwnAccountGuard)
  @UseInterceptors(AvatarUploadInterceptor)
  uploadAvatar(
    @RequesterId() requesterId: string,
    @Param('id') userId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UserDto> {
    return this.changeUserAvatar.execute({
      requesterId,
      userId,
      avatarPath: file ? toAvatarPath(file.filename) : undefined,
    });
  }

  @Delete('delete/:id')
  async remove(
    @RequesterId() requesterId: string,
    @Param('id') userId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    await this.deleteUser.execute({ requesterId, userId });
    this.authCookie.clear(response);
    return { message: 'User has been deleted' };
  }
}
