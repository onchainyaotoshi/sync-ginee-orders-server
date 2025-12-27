import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string) {
    const exists = await this.users.findByEmail(email);
    if (exists) throw new ConflictException('Email already registered');

    const hash = await bcrypt.hash(password, 10);
    const user = await this.users.create({ email, password: hash });

    return this.issueToken(user.id, user.email, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueToken(user.id, user.email, user.role);
  }

  private async issueToken(userId: string, email: string, role: string) {
    // payload minimal: sub (userId) + email + role
    const payload = { sub: userId, email, role };
    return {
      access_token: await this.jwt.signAsync(payload),
    };
  }
}
