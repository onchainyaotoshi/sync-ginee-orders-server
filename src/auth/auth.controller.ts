import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Req } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(
    @Req()
    req: {
      user: { id: string; email: string; role: string; tokenVersion: number };
    },
  ) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: { user: { id: string } }) {
    await this.auth.logout(req.user.id);
    return {
      success: true,
    };
  }
}
