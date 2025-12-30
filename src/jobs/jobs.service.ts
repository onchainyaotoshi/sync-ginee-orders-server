import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JobMaster, JobMasterState, Prisma } from '../generated/prisma/client';

const ALLOWED_KEYS = new Set<string>([
  'orderId',
  'country',
  'channel',
  'shopId',
  'orderType',
  'orderStatus',
  'currency',
  'totalAmount',
  'paymentMethod',
  'isCod',

  'externalShopId',
  'externalOrderId',
  'externalOrderSn',
  'externalBookingSn',
  'externalOrderStatus',
  'externalCreateAt',
  'externalUpdateAt',

  'problemOrderTypes',

  'createAt',
  'payAt',
  'purchasedOn',
  'closeAt',
  'lastUpdateAt',
  'promisedToShipBefore',
  'totalQuantity',

  'customerName',
]);

function pickAllowed(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (ALLOWED_KEYS.has(k)) out[k] = v;
  }
  return out;
}

@Injectable()
export class JobsService {
  // eslint-disable-next-line prettier/prettier
  constructor(private readonly prisma: PrismaService) { }

  ensureJob(
    jobDate: Date,
    parameters: Prisma.InputJsonValue = {},
    appName: string = 'default',
  ) {
    return this.prisma.jobMaster.upsert({
      where: {
        jobDate_appName: { jobDate, appName },
      },
      create: {
        appName,
        jobDate,
        parameters,
      },
      update: {}, // no-op
    });
  }

  async getLatestJobDate(appName: string = 'default'): Promise<Date | null> {
    const row = await this.prisma.jobMaster.findFirst({
      where: { appName },
      orderBy: { jobDate: 'desc' },
      select: { jobDate: true },
    });
    return row?.jobDate ?? null;
  }

  async claimOldestPendingJob(
    appName = 'default',
  ): Promise<{ id: bigint; jobDate: Date } | null> {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.jobMaster.findFirst({
        where: { appName, state: JobMasterState.PENDING },
        orderBy: { jobDate: 'asc' },
        select: { id: true, jobDate: true },
      });

      if (!job) return null;

      await tx.jobMaster.update({
        where: { id: job.id },
        data: { state: JobMasterState.PROCESSING as JobMasterState },
      });

      return job;
    });
  }

  async createJobDetail(
    jobMasterId: bigint,
    payload: {
      result?: Prisma.InputJsonValue;
      error?: Prisma.InputJsonValue;
      resultKey?: string;
      executionStart: Date;
      executionEnd: Date;
    },
  ): Promise<void> {
    await this.prisma.jobDetail.create({
      data: {
        jobMasterId,
        executionStart: payload.executionStart,
        executionEnd: payload.executionEnd,
        executionTimeMs:
          payload.executionEnd.getTime() - payload.executionStart.getTime(),
        result: payload.result,
        error: payload.error,
        resultKey: payload.resultKey,
      },
    });
  }

  async getProcessingJobs(appName: string = 'default'): Promise<JobMaster[]> {
    return this.prisma.jobMaster.findMany({
      where: {
        appName,
        state: JobMasterState.PROCESSING as JobMasterState,
      },
      orderBy: {
        jobDate: 'asc',
      },
    });
  }

  async isConsensusReached(
    jobMasterId: bigint,
    threshold: number = 3,
  ): Promise<{ resultKey: string; count: number } | null> {
    const rows = await this.prisma.jobDetail.groupBy({
      by: ['resultKey'],
      where: {
        jobMasterId,
        resultKey: { not: null },
      },
      _count: { resultKey: true },
      having: {
        resultKey: {
          _count: { gte: threshold },
        },
      },
      orderBy: {
        resultKey: 'asc',
      },
      take: 1,
    });

    if (rows.length === 0) return null;

    const row = rows[0];

    return {
      resultKey: row.resultKey as string, // aman karena not: null
      count: row._count.resultKey,
    };
  }

  async updateJobState(
    jobId: bigint,
    state: JobMasterState,
  ): Promise<JobMaster> {
    return this.prisma.jobMaster.update({
      where: { id: jobId },
      data: { state },
    });
  }

  async consensusReach(
    jobId: bigint,
    consensusKey: string,
    consensusResult: any,
  ) {
    const totalInserted = await this.insertOrdersNoBatch(
      jobId,
      consensusResult,
    );
    if (totalInserted.toString() === consensusKey) {
      await this.prisma.jobMaster.update({
        where: { id: jobId },
        data: {
          state: JobMasterState.CONSENSUS_REACHED,
          consensusKey: consensusKey,
          consensusAt: new Date(),
        },
      });
    }
  }

  async insertOrdersNoBatch(
    jobMasterId: bigint,
    orders: unknown,
  ): Promise<number> {
    if (!Array.isArray(orders)) throw new Error('orders must be an array');

    const rows = orders.map((o) => {
      if (!o || typeof o !== 'object') throw new Error('order must be object');

      // ⚠️ No normalize: hanya buang key liar
      const filtered = pickAllowed(o as Record<string, unknown>);

      // tambah jobMasterId
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return {
        jobMasterId,
        ...filtered,
      } as Prisma.GineeOrderMasterCreateManyInput; // masih perlu cast karena kita gak validasi tipe
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await this.prisma.gineeOrderMaster.createMany({
      data: rows,
      skipDuplicates: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return result.count;
  }
}
