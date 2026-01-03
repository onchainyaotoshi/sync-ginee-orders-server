import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { JobsService } from 'src/jobs/jobs.service';
import { DateTime } from 'luxon';
import { toUtcRangeParams, toDbDate } from 'src/common/time/util';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly job: JobsService,
    // eslint-disable-next-line prettier/prettier
    ) { }

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'Asia/Jakarta' })
  async run() {
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
    const maxDaysPerRun = 90;
    let created = 0;

    while (cursorWib <= targetWib && created < maxDaysPerRun) {
      const jobDate = toDbDate(cursorWib); // DATE-only stabil
      const params = toUtcRangeParams(cursorWib); // UTC timestamps

      await this.job.ensureJob(jobDate, {
        createSince: params.startIso,
        createTo: params.endIso,
      });

      cursorWib = cursorWib.plus({ days: 1 });
      created += 1;
    }

    if (cursorWib <= targetWib) {
      this.logger.warn(
        `Backfill not finished in one run (limit ${maxDaysPerRun}). Next cursor=${cursorWib.toISODate()} target=${targetWib.toISODate()}`,
      );
    }
  }
}
