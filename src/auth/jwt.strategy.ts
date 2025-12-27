import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  tokenVersion: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is missing');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    if (payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Token revoked');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
