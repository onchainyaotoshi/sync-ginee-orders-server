import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Public } from 'src/common/decorators/public.decorator';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('time')
  async time() {
    const appNow = new Date();

    try {
      const tzRows = await this.prisma.$queryRaw<
        { TimeZone: string }[]
      >`SHOW TIMEZONE`;

      const nowRows = await this.prisma.$queryRaw<
        { now: Date }[]
      >`SELECT now()`;

      const dbTimezone = tzRows[0]?.TimeZone ?? 'unknown';
      const dbNow = nowRows[0]?.now;

      return {
        ok: true,

        application: {
          timezone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ??
            process.env.TZ ??
            'unknown',
          now: appNow.toISOString(),
          nowLocal: appNow.toString(),
        },

        database: {
          timezone: dbTimezone,
          now: dbNow?.toISOString(),
          nowLocal: dbNow?.toString(),
        },
      };
    } catch (err: unknown) {
      throw new ServiceUnavailableException({
        ok: false,
        message: getErrorMessage(err),
      });
    }
  }

  @Get('db')
  async db() {
    const start = Date.now();

    try {
      await this.prisma.$queryRaw<[{ result: number }]>`SELECT 1 AS result`;

      return {
        ok: true,
        db: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      throw new ServiceUnavailableException({
        ok: false,
        db: 'down',
        latencyMs: Date.now() - start,
        message: getErrorMessage(err),
      });
    }
  }
}
