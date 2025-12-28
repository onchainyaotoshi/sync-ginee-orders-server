import type { MsString } from './ms-string';

export function expiresAtFrom(expiresIn: MsString): Date {
  const m = expiresIn.match(/^(\d+)(ms|s|m|h|d|w|y)$/);
  if (!m) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const n = Number(m[1]);
  const unit = m[2] as MsString extends `${number}${infer U}` ? U : never;

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
                : 365 * 24 * 60 * 60 * 1000;

  return new Date(Date.now() + n * mult);
}
