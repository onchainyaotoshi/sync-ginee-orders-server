import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { JobMaster, JobMasterState, Prisma } from 'src/generated/prisma/client';
import { GineeOrderMasterService } from 'src/orders/ginee_order_master.service';

@Injectable()
export class JobsService {
  // eslint-disable-next-line prettier/prettier
  constructor(private readonly prisma: PrismaService, private readonly master: GineeOrderMasterService) { }

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

  async updateStatusToProcessing(
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
        error: { equals: Prisma.DbNull },
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

  async updateStatusToConsensusReach(
    jobId: bigint,
    consensusKey: string,
    consensusResult: any,
  ) {
    const totalInserted = await this.master.insertOrdersNoBatch(
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

  async getConsensusReachedJobs(
    appName: string = 'default',
  ): Promise<JobMaster[]> {
    return this.prisma.jobMaster.findMany({
      where: {
        appName,
        state: JobMasterState.CONSENSUS_REACHED as JobMasterState,
      },
      orderBy: {
        jobDate: 'asc',
      },
    });
  }

  setErrorOnJobMaster(jobId: bigint, error: Prisma.InputJsonValue) {
    return this.prisma.jobMaster.update({
      where: { id: jobId },
      data: { error },
    });
  }

  updateStatusToDetailFetched(jobId: bigint) {
    return this.prisma.jobMaster.update({
      where: { id: jobId },
      data: { state: JobMasterState.DETAIL_FETCHED, detailFetchAt: new Date() },
    });
  }
}
