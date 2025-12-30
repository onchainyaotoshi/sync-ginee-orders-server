import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { JobsService } from 'src/jobs/jobs.service';
import { DateTime } from 'luxon';
import { GineeService } from 'src/ginee/ginee.service';
import { JobMaster, Prisma } from 'src/generated/prisma/client';

type OrderBackfillParams = Readonly<{
  createSince: string; // UTC ISO
  createTo: string; // UTC ISO
}>;

type OrderInfo = Record<string, unknown>;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly job: JobsService,
    private readonly ginee: GineeService,
    // eslint-disable-next-line prettier/prettier
  ) { }

  private toJobDateDbDate(wibDay: DateTime): Date {
    // untuk kolom @db.Date: kirim UTC midnight di "tanggal WIB" tsb
    return new Date(Date.UTC(wibDay.year, wibDay.month - 1, wibDay.day));
  }

  private toUtcRangeParams(wibDay: DateTime): OrderBackfillParams {
    const startUtc = wibDay.startOf('day').toUTC();
    const endUtc = wibDay.endOf('day').toUTC();

    return {
      createSince: startUtc.toISO()!,
      createTo: endUtc.toISO()!,
    };
  }

  private ToWibString(jobDate: Date): string {
    return DateTime.fromJSDate(jobDate, { zone: 'UTC' }) // DATE disimpan sebagai UTC midnight
      .setZone('Asia/Jakarta')
      .toISODate()!; // "YYYY-MM-DD"
  }

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'Asia/Jakarta' }) // tiap menit, detik 10
  async ensureJob(): Promise<void> {
    const startDateStr = this.config.get<string>('ORDER_BACKFILL_START_DATE');
    if (!startDateStr) throw new Error('ORDER_BACKFILL_START_DATE is not set');

    const startFromWib = DateTime.fromISO(startDateStr, {
      zone: 'Asia/Jakarta',
    }).startOf('day');
    if (!startFromWib.isValid) {
      throw new Error(`ORDER_BACKFILL_START_DATE invalid: ${startDateStr}`);
    }

    // target selalu "kemarin WIB" supaya data hari ini gak setengah
    const targetWib = DateTime.now()
      .setZone('Asia/Jakarta')
      .minus({ days: 1 })
      .startOf('day');

    const latestJobDate = await this.job.getLatestJobDate(); // returns Date | null (from @db.Date)

    const latestWib = latestJobDate
      ? DateTime.fromJSDate(latestJobDate, { zone: 'UTC' })
          .setZone('Asia/Jakarta')
          .startOf('day')
      : null;

    // cursor = hari setelah latest, atau startFromWib kalau belum ada job sama sekali
    let cursorWib = latestWib ? latestWib.plus({ days: 1 }) : startFromWib;

    // sudah tidak ada yang perlu dibuat
    if (cursorWib > targetWib) {
      this.logger.log(
        `No backfill needed. latest=${latestWib?.toISODate() ?? 'none'} target=${targetWib.toISODate()}`,
      );
      return;
    }

    // safety: jangan sampai loop tanpa batas
    const maxDaysPerRun = 31;
    let created = 0;

    while (cursorWib <= targetWib && created < maxDaysPerRun) {
      const jobDate = this.toJobDateDbDate(cursorWib); // DATE-only stabil
      const params = this.toUtcRangeParams(cursorWib); // UTC timestamps

      await this.job.ensureJob(jobDate, params);

      this.logger.log(
        `Ensured job: wib=${cursorWib.toISODate()} storedAs=${jobDate.toISOString()} since=${params.createSince} to=${params.createTo}`,
      );

      cursorWib = cursorWib.plus({ days: 1 });
      created += 1;
    }

    if (cursorWib <= targetWib) {
      this.logger.warn(
        `Backfill not finished in one run (limit ${maxDaysPerRun}). Next cursor=${cursorWib.toISODate()} target=${targetWib.toISODate()}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'Asia/Jakarta' })
  async queueToProcessing(): Promise<void> {
    await this.job.claimOldestPendingJob();
  }

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'Asia/Jakarta' })
  async processing(): Promise<void> {
    const jobs = await this.job.getProcessingJobs();
    for (const job of jobs) {
      const resp = await this.processJob(job);

      const consensusReached = await this.job.isConsensusReached(job.id, 2);
      if (consensusReached) {
        await this.job.consensusReach(job.id, consensusReached.resultKey, resp);
        continue;
      }

      await new Promise((r) => setTimeout(r, 5000)); // kasih jeda 3 detik antar job
    }
  }

  private async processJob(job: JobMaster): Promise<OrderInfo[]> {
    const dateStr = this.ToWibString(job.jobDate);
    const startedAt = new Date();

    try {
      // kalau SDK kamu belum typed, pakai type assertion aman
      const resp = (await this.ginee.client.orders.listAllByDateWIB(
        dateStr,
      )) as unknown;

      if (!Array.isArray(resp)) {
        throw new Error('Ginee listAllByDateWIB returned non-array');
      }

      const orders = resp as OrderInfo[];

      const endedAt = new Date();

      await this.job.createJobDetail(job.id, {
        resultKey: orders.length.toString(),
        executionStart: startedAt,
        executionEnd: endedAt,
      });

      return orders;
    } catch (err: unknown) {
      const endedAt = new Date();

      await this.job.createJobDetail(job.id, {
        error: this.serializeError(err),
        executionStart: startedAt,
        executionEnd: endedAt,
      });

      return [];
    }
  }

  private serializeError(err: unknown): Prisma.InputJsonValue {
    if (err instanceof Error) {
      return {
        name: err.name,
        message: err.message,
        stack: err.stack ?? null,
      } satisfies Prisma.InputJsonObject;
    }

    if (typeof err === 'string') {
      return { message: err } satisfies Prisma.InputJsonObject;
    }

    if (err && typeof err === 'object') {
      // sanitize object → pastikan value json-safe
      return JSON.parse(JSON.stringify(err)) as Prisma.InputJsonObject;
    }

    return { message: 'Unknown error' } satisfies Prisma.InputJsonObject;
  }
}
