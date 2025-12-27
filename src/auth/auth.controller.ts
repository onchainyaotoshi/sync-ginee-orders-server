import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(
    @Body() dto: { email: string; password: string },
    @Req() req: Request,
  ) {
    return this.auth.register(dto.email, dto.password, req);
  }

  @Post('login')
  login(@Body() dto: { email: string; password: string }, @Req() req: Request) {
    return this.auth.login(dto.email, dto.password, req);
  }

  @Post('refresh')
  refresh(@Body('refresh_token') refreshToken: string, @Req() req: Request) {
    return this.auth.refresh(refreshToken, req);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.auth.logout(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request) {
    return req.user; // ✅ typed, ESLint happy
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/force-logout/:id')
  adminForceLogout(@Req() req: any, @Param('id') userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.auth.adminForceLogout(req.user, userId);
  }
}
