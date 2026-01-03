import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from 'src/jobs/jobs.service';

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    private readonly job: JobsService,
    // eslint-disable-next-line prettier/prettier
  ) { }

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'Asia/Jakarta' })
  async run(): Promise<void> {
    await this.job.updateStatusToProcessing();
  }
}
