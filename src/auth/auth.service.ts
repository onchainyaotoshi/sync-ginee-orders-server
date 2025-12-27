import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { Request } from 'express';

import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { sha256 } from './token-hash';
import type { AccessTokenPayload, RefreshTokenPayload } from './auth.types';

type MsString = `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

type UserForTokens = {
  id: string;
  email: string;
  role: string;
  tokenVersion: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------- register/login (contoh) ----------
  async register(email: string, password: string, req?: Request) {
    const exists = await this.users.findByEmail(email);
    if (exists) throw new ConflictException('Email already registered');

    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hash, role: 'user' },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });

    return this.issueTokens(user, req);
  }

  async login(email: string, password: string, req?: Request) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        password: true,
        tokenVersion: true,
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const safeUser: UserForTokens = {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    return this.issueTokens(safeUser, req);
  }

  // ---------- FORCE LOGOUT (self) ----------
  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.users.bumpTokenVersion(userId);

    return { ok: true };
  }

  // ---------- ADMIN FORCE LOGOUT ----------
  async adminForceLogout(
    actor: { id: string; role: string },
    targetUserId: string,
  ) {
    if (actor.role !== 'admin') throw new ForbiddenException('Admin only');

    await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.users.bumpTokenVersion(targetUserId);
    return { ok: true, targetUserId };
  }

  // ---------- ISSUE TOKENS ----------
  async issueTokens(user: UserForTokens, req?: Request) {
    const accessSecret = this.mustGet('JWT_ACCESS_SECRET');
    const refreshSecret = this.mustGet('JWT_REFRESH_SECRET');

    const accessExpiresIn = (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ??
      '15m') as MsString;
    const refreshExpiresIn = (this.config.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) ?? '30d') as MsString;

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const jti = uuidv4();
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
      jti,
    };

    const [access_token, refresh_token] = await Promise.all([
      // access pakai secret default dari JwtModule juga boleh. Ini explicit biar jelas.
      this.jwt.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    // simpan refresh token row dengan fingerprint deterministic
    const tokenHash = sha256(`${user.id}.${jti}`);
    const expiresAt = this.expiresAtFrom(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: req?.headers['user-agent'],
        ip: this.getIp(req),
      },
    });

    return { access_token, refresh_token };
  }

  // ---------- REFRESH (ROTATION) ----------
  async refresh(refreshToken: string, req?: Request) {
    const refreshSecret = this.mustGet('JWT_REFRESH_SECRET');

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub;
    const { tokenVersion, jti } = payload;

    // check user still valid & tokenVersion match
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.tokenVersion !== tokenVersion) {
      throw new UnauthorizedException('Token revoked');
    }

    // lookup refresh token record (deterministic)
    const tokenHash = sha256(`${userId}.${jti}`);

    const tokenRow = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!tokenRow)
      throw new UnauthorizedException('Refresh token revoked/expired');

    // rotate: revoke old + create new
    await this.prisma.refreshToken.update({
      where: { id: tokenRow.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user, req);
  }

  // ---------- helpers ----------
  private mustGet(key: string) {
    const v = this.config.get<string>(key);
    if (!v) throw new Error(`${key} is missing`);
    return v;
  }

  private getIp(req?: Request): string | undefined {
    if (!req) return undefined;
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string') return xff.split(',')[0]?.trim();
    // express adds this
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return (req as any).ip;
  }

  private expiresAtFrom(expiresIn: MsString): Date {
    const m = expiresIn.match(/^(\d+)(ms|s|m|h|d|w|y)$/);
    if (!m) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const n = Number(m[1]);
    const unit = m[2];

    const mult =
      unit === 'ms'
        ? 1
        : unit === 's'
          ? 1000
          : unit === 'm'
            ? 60 * 1000
            : unit === 'h'
              ? 60 * 60 * 1000
              : unit === 'd'
                ? 24 * 60 * 60 * 1000
                : unit === 'w'
                  ? 7 * 24 * 60 * 60 * 1000
                  : 365 * 24 * 60 * 60 * 1000; // y

    return new Date(Date.now() + n * mult);
  }
}
