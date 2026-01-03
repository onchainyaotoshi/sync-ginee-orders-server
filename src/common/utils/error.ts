import safeStringify from 'fast-safe-stringify';
import { Prisma } from 'src/generated/prisma/client';

const MAX_STACK_CHARS = 8_000;
const MAX_MESSAGE_CHARS = 2_000;

function truncate(input: string, max: number): string {
  return input.length > max
    ? `${input.slice(0, max)}...[truncated:${input.length - max}]`
    : input;
}

export function serializeError(err: unknown): Prisma.InputJsonValue {
  try {
    if (err instanceof Error) {
      return {
        kind: 'Error',
        name: err.name,
        message: truncate(err.message, MAX_MESSAGE_CHARS),
        stack: err.stack ? truncate(err.stack, MAX_STACK_CHARS) : null,
      } satisfies Prisma.InputJsonObject;
    }

    if (typeof err === 'string') {
      return {
        kind: 'StringError',
        message: truncate(err, MAX_MESSAGE_CHARS),
      } satisfies Prisma.InputJsonObject;
    }

    if (err && typeof err === 'object') {
      const preview = JSON.parse(
        safeStringify(err, undefined, 1),
      ) as Prisma.InputJsonValue;

      return {
        kind: 'ObjectError',
        preview,
      } satisfies Prisma.InputJsonObject;
    }

    return {
      kind: 'UnknownError',
      message: 'Unknown error',
    } satisfies Prisma.InputJsonObject;
  } catch {
    // ❗ serializer TIDAK BOLEH throw
    return {
      kind: 'Unserializable',
      message: 'Failed to serialize error',
    } satisfies Prisma.InputJsonObject;
  }
}
