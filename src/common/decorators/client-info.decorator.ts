import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type ClientInfoType = {
  userAgent?: string;
  ip?: string;
};

export const ClientInfo = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ClientInfoType => {
    const req = ctx.switchToHttp().getRequest<{
      headers?: Record<string, unknown>;
      ip?: string;
    }>();

    const ua = req.headers?.['user-agent'];
    const userAgent = typeof ua === 'string' ? ua : undefined;

    const ip = typeof req.ip === 'string' ? req.ip : undefined;

    return { userAgent, ip };
  },
);
