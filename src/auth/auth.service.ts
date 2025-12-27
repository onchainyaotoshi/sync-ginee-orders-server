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

    return this.issueToken(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueToken(user);
  }

  async logout(id: string){
    return this.users.bumpTokenVersion(id);
  }

  private async issueToken(user: {
    id: string;
    email: string;
    role: string;
    tokenVersion: number;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    return {
      access_token: await this.jwt.signAsync(payload),
    };
  }
}
