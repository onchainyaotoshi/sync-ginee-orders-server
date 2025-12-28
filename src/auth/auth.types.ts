export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
};

export type RefreshTokenPayload = {
  sub: string;
  tokenVersion: number;
  jti: string;
  iat?: number;
  exp?: number;
};

export type TokenPairResponse = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};
