import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from 'src/jobs/jobs.service';
import { GineeService } from 'src/ginee/ginee.service';
import { JobMaster } from 'src/generated/prisma/client';
import { ToWibString } from 'src/common/time/util';
import { serializeError } from 'src/common/utils/error';

@Injectable()
export class ExtractOrderMasterService {
  private readonly logger = new Logger(ExtractOrderMasterService.name);

  constructor(
    private readonly job: JobsService,
    private readonly ginee: GineeService,
    // eslint-disable-next-line prettier/prettier
  ) { }

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'Asia/Jakarta' })
  async run(): Promise<void> {
    const jobs = await this.job.getProcessingJobs();
    for (const job of jobs) {
      const resp = await this.fetchGineeOrderMaster(job);

      const consensusReached = await this.job.isConsensusReached(job.id, 2);
      if (consensusReached) {
        await this.job.updateStatusToConsensusReach(
          job.id,
          consensusReached.resultKey,
          resp,
        );
        continue;
      }

      await new Promise((r) => setTimeout(r, 5000)); // kasih jeda 3 detik antar job
    }
  }

  private async fetchGineeOrderMaster(
    job: JobMaster,
  ): Promise<Record<string, unknown>[]> {
    const dateStr = ToWibString(job.jobDate);
    const startedAt = new Date();

    try {
      // kalau SDK kamu belum typed, pakai type assertion aman
      const resp = (await this.ginee.client.orders.listAllByDateWIB(
        dateStr,
      )) as unknown;

      if (!Array.isArray(resp)) {
        throw new Error('Ginee listAllByDateWIB returned non-array');
      }

      const orders = resp as Record<string, unknown>[];

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
        error: serializeError(err),
        executionStart: startedAt,
        executionEnd: endedAt,
      });

      return [];
    }
  }
}
