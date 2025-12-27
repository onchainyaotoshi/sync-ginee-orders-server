import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('db')
  async db() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, db: 'up', latencyMs: Date.now() - start };
    } catch (err: any) {
      throw new ServiceUnavailableException({
        ok: false,
        db: 'down',
        latencyMs: Date.now() - start,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        message: err?.message ?? 'Database connection failed',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        code: err?.code,
      });
    }
  }
}
