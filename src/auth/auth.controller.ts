import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';

import {
  ClientInfo,
  type ClientInfoType,
} from '../common/decorators/client-info.decorator';
import {
  CurrentUser,
  type CurrentUserType,
} from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(
    @Body() dto: { email: string; password: string },
    @ClientInfo() client: ClientInfoType,
  ) {
    return this.auth.register(dto.email, dto.password, client);
  }

  @Public()
  @Post('login')
  login(
    @Body() dto: { email: string; password: string },
    @ClientInfo() client: ClientInfoType,
  ) {
    return this.auth.login(dto.email, dto.password, client);
  }

  @Public()
  @Post('refresh')
  refresh(
    @Body('refreshToken') refreshToken: string, // <-- konsisten camelCase
    @ClientInfo() client: ClientInfoType,
  ) {
    return this.auth.refresh(refreshToken, client);
  }

  // ✅ ini logout ALL devices (tokenVersion++)
  @Post('logout-all')
  logoutAll(@CurrentUser() user: CurrentUserType) {
    return this.auth.logout(user.id);
  }

  @Get('me')
  me(@CurrentUser() user: CurrentUserType) {
    return user;
  }

  // ✅ list sessions per device
  @Get('sessions')
  listSessions(@CurrentUser() user: CurrentUserType) {
    return this.auth.listSessions(user.id);
  }

  // ✅ revoke 1 session/device by sessionId (RefreshToken.id)
  @Post('sessions/:id/revoke')
  revokeSession(
    @CurrentUser() user: CurrentUserType,
    @Param('id') sessionId: string,
  ) {
    return this.auth.revokeSession(user.id, sessionId);
  }

  // ✅ admin force logout user (all devices)
  @Post('admin/force-logout/:id')
  adminForceLogout(
    @CurrentUser() user: CurrentUserType,
    @Param('id') targetUserId: string,
  ) {
    return this.auth.adminForceLogout(user, targetUserId);
  }
}
