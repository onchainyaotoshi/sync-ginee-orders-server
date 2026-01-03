//  eslint-disable
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  IncrementalSyncHistoryState,
  Prisma,
} from 'src/generated/prisma/client';

@Injectable()
export class IncrementalSyncHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatest(
    appName: string = 'default',
  ): Promise<Prisma.JsonValue | null> {
    const row = await this.prisma.incrementalSyncHistory.findFirst({
      where: {
        appName,
        error: { equals: Prisma.DbNull },
        state: IncrementalSyncHistoryState.COMPLETE,
      },
      orderBy: { createdAt: 'desc' },
      select: { parameters: true },
    });

    return row?.parameters ?? null;
  }

  setError(
    id: bigint,
    error: Prisma.InputJsonValue,
    appName: string = 'default',
  ) {
    return this.prisma.incrementalSyncHistory.update({
      where: { id: id, appName },
      data: { error, state: IncrementalSyncHistoryState.ERROR },
    });
  }

  create(parameters: Prisma.InputJsonValue = {}, appName: string = 'default') {
    return this.prisma.incrementalSyncHistory.create({
      data: {
        appName,
        parameters,
      },
    });
  }

  setConsensusKey(
    id: bigint,
    consensusKey: string,
    appName: string = 'default',
  ) {
    return this.prisma.incrementalSyncHistory.update({
      where: { id: id, appName },
      data: { consensusKey },
    });
  }

  updateStatusToComplete(
    id: bigint,
    appName: string = 'default',
    result: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    return db.incrementalSyncHistory.update({
      where: { id: id, appName },
      data: { state: IncrementalSyncHistoryState.COMPLETE, result },
    });
  }

  async updateExecutionStats(
    id: bigint,
    appName: string,
    payload: {
      executionEnd: Date;
      executionTimeMs: number;
    },
  ) {
    return this.prisma.incrementalSyncHistory.update({
      where: { id: id, appName },
      data: {
        executionEnd: payload.executionEnd,
        executionTimeMs: payload.executionTimeMs,
      },
    });
  }
}
