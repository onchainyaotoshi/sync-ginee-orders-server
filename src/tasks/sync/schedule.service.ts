import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { IncrementalSyncHistoryService } from 'src/jobs/incremental_sync_history';
import { serializeError } from 'src/common/utils/error';
import { Prisma } from 'src/generated/prisma/client';
import { GineeService } from 'src/ginee/ginee.service';
import { GineeOrderMasterService } from 'src/orders/ginee_order_master.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  private readonly appName = 'sync_ginee_orders';

  constructor(
    private readonly config: ConfigService,
    private readonly sync: IncrementalSyncHistoryService,
    private readonly ginee: GineeService,
    private readonly orderMaster: GineeOrderMasterService,
    private readonly prisma: PrismaService,
    // eslint-disable-next-line prettier/prettier
  ) { }

  @Cron('*/1 * * * *', { timeZone: 'Asia/Jakarta' })
  async run() {
    let nowUtc: DateTime,
      lastUpdateTo: DateTime,
      latest: Prisma.JsonValue | null,
      parameters: Prisma.InputJsonValue;
    // eslint-disable-next-line prefer-const
    latest = await this.sync.getLatest(this.appName);
    // eslint-disable-next-line prefer-const
    nowUtc = DateTime.utc();
    if (!latest) {
      lastUpdateTo = nowUtc.minus({
        days: this.config.get<number>('ORDER_SYNC_MAX_DAYS', 1),
      });
      parameters = {
        lastUpdateSince: lastUpdateTo ? lastUpdateTo.toISO() : null,
        lastUpdateTo: nowUtc.toISO(),
      };
      await this.incrementalSyncJob(parameters);
    } else {
      await this.incrementalSyncJob({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        lastUpdateSince: latest.lastUpdateTo,
        lastUpdateTo: nowUtc.toISO(),
      });
    }
  }

  async incrementalSyncJob(parameters: Prisma.InputJsonValue) {
    const executionStart = Date.now(); // ms
    const row = await this.sync.create(parameters, this.appName);
    try {
      const resp = await this.ginee.client.orders.listAll(parameters as any);
      await this.sync.setConsensusKey(
        row.id,
        resp.length.toString(),
        this.appName,
      );

      await this.prisma.$transaction(async (tx) => {
        if (resp.length > 0) {
          const { stats, orderIdsApplied } = await this.orderMaster.massUpdate2(
            resp,
            tx,
          );
          await this.sync.updateStatusToComplete(
            row.id,
            this.appName,
            stats,
            tx,
          );
        } else {
          await this.sync.updateStatusToComplete(
            row.id,
            this.appName,
            { affected: 0 },
            tx,
          );
        }
      });
    } catch (error) {
      await this.sync.setError(row.id, serializeError(error), this.appName);
    } finally {
      const executionEnd = new Date();
      const executionTimeMs = Date.now() - executionStart;

      await this.sync.updateExecutionStats(row.id, this.appName, {
        executionEnd,
        executionTimeMs,
      });
    }
  }
}
