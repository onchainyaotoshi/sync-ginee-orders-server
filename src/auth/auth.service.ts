import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { sha256 } from './token-hash';

import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenPairResponse,
} from './auth.types';
import type { ClientInfoType } from '../common/decorators/client-info.decorator';
import type { MsString } from '../common/time/ms-string';
import { expiresAtFrom } from '../common/time/expires-at';

import type { CurrentUserType } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, client: ClientInfoType) {
    const exists = await this.users.findByEmail(email);
    if (exists) throw new ConflictException('Email already registered');

    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hash, role: 'user' },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });

    return this.issueTokens(user, client);
  }

  async login(email: string, password: string, client: ClientInfoType) {
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

    const safeUser: CurrentUserType = {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    return this.issueTokens(safeUser, client);
  }

  logout(userId: string) {
    return this.users.revoke(userId);
  }

  adminForceLogout(user: CurrentUserType, targetUserId: string) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin only');
    return this.users.revoke(targetUserId);
  }

  async issueTokens(
    user: CurrentUserType,
    client: ClientInfoType,
  ): Promise<TokenPairResponse> {
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
      this.jwt.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    const tokenHash = sha256(`${user.id}.${jti}`);
    const expiresAt = expiresAtFrom(refreshExpiresIn);

    const session = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: client.userAgent,
        ip: client.ip,
      },
      select: { id: true },
    });

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      sessionId: session.id,
    };
  }

  async refresh(refreshToken: string, client: ClientInfoType) {
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, tokenVersion: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.tokenVersion !== tokenVersion)
      throw new UnauthorizedException('Token revoked');

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

    await this.prisma.refreshToken.update({
      where: { id: tokenRow.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user, client);
  }

  async listSessions(userId: string) {
    const now = new Date();

    const rows = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        userAgent: true,
        ip: true,
      },
    });

    return {
      sessions: rows.map((r) => {
        const isExpired = r.expiresAt <= now;
        const isRevoked = !!r.revokedAt;

        return {
          id: r.id,
          userAgent: r.userAgent,
          ip: r.ip,
          createdAt: r.createdAt,
          expiresAt: r.expiresAt,
          revokedAt: r.revokedAt,
          status: isRevoked ? 'revoked' : isExpired ? 'expired' : 'active',
        } as const;
      }),
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    const row = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, revokedAt: true },
    });

    if (!row) throw new NotFoundException('Session not found');
    if (row.userId !== userId) throw new ForbiddenException('Not your session');

    if (row.revokedAt) return { ok: true, id: sessionId, alreadyRevoked: true };

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { ok: true, id: sessionId };
  }

  private mustGet(key: string) {
    const v = this.config.get<string>(key);
    if (!v) throw new Error(`${key} is missing`);
    return v;
  }
}
