import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type CurrentUserType = {
  id: string;
  email: string;
  role: string;
  tokenVersion: number;
};

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CurrentUserType => {
    //Catatan: req.user diisi oleh JwtStrategy/guard kamu.
    const req = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    return req.user as CurrentUserType;
  },
);
