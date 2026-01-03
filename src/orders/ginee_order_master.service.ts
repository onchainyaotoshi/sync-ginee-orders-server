import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { deriveKeySet, pickAllowedFields } from 'src/common/utils/collections';

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

const UPDATABLE_KEYS = deriveKeySet(ALLOWED_KEYS, [
  'orderId',
  'country',
  'channel',
  'shopId',
  'currency',
  'externalShopId',
  'externalCreateAt',
  'createAt',
  'customerName',
]);

@Injectable()
export class GineeOrderMasterService {
  // eslint-disable-next-line prettier/prettier
  constructor(private readonly prisma: PrismaService) { }

  async insertOrdersNoBatch(
    jobMasterId: bigint,
    orders: unknown,
  ): Promise<number> {
    if (!Array.isArray(orders)) throw new Error('orders must be an array');

    const rows = orders.map((o) => {
      if (!o || typeof o !== 'object') throw new Error('order must be object');

      // ⚠️ No normalize: hanya buang key liar
      const filtered = pickAllowedFields(
        o as Record<string, unknown>,
        ALLOWED_KEYS,
      );

      // tambah jobMasterId

      return {
        jobMasterId,
        ...filtered,
      } as Prisma.GineeOrderMasterCreateManyInput; // masih perlu cast karena kita gak validasi tipe
    });

    const result = await this.prisma.gineeOrderMaster.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return result.count;
  }

  getByJobMasterId(jobMasterId: bigint) {
    return this.prisma.gineeOrderMaster.findMany({
      where: { jobMasterId },
    });
  }

  async getOrderIdsWithoutItems(
    jobMasterId: bigint,
    take = 100,
  ): Promise<string[]> {
    const rows = await this.prisma.gineeOrderMaster.findMany({
      where: {
        jobMasterId,
        items: {
          none: {}, // 🔥 belum ada satupun item
        },
      },
      select: {
        orderId: true,
      },
      orderBy: {
        orderId: 'asc', // stabil
      },
      take,
    });

    return rows.map((r) => r.orderId);
  }

  getByOrderIdAndJobMasterId(orderId: string, jobMasterId?: bigint) {
    return this.prisma.gineeOrderMaster.findFirst({
      where: {
        orderId,
        ...(jobMasterId !== undefined ? { jobMasterId } : {}),
      },
    });
  }

  async massUpdate(
    orders: unknown[],
    tx: Prisma.TransactionClient,
  ): Promise<string[]> {
    // base cols dari payload
    const insertCols = [...ALLOWED_KEYS];
    const updateCols = [...UPDATABLE_KEYS].filter((c) => c !== 'orderId');

    const q = (c: string): string => `"${c.replaceAll('"', '""')}"`;

    // ✅ tambah updatedAt ke insert columns (karena raw SQL tidak auto @updatedAt)
    const insertColsWithAudit = [...insertCols, 'updatedAt'];
    const insertColsSql = Prisma.raw(insertColsWithAudit.map(q).join(', '));

    // ✅ tambah updatedAt = now() di UPDATE
    const setSql = Prisma.raw(
      [
        ...updateCols.map((c) => `${q(c)} = EXCLUDED.${q(c)}`),
        `"updatedAt" = now()`,
      ].join(',\n'),
    );

    const rows: Record<string, unknown>[] = (orders ?? []).map((o) =>
      pickAllowedFields((o ?? {}) as Record<string, unknown>, ALLOWED_KEYS),
    );

    if (rows.length === 0) return [];

    const rowsJson: string = JSON.stringify(rows);

    const recordsetColumns = Prisma.raw(`
    "orderId" text,
    "country" text,
    "channel" text,
    "shopId" text,

    "orderType" text,
    "orderStatus" text,
    "currency" text,

    "totalAmount" numeric,
    "paymentMethod" text,
    "isCod" boolean,

    "externalShopId" text,
    "externalOrderId" text,
    "externalOrderSn" text,
    "externalBookingSn" text,
    "externalOrderStatus" text,
    "externalCreateAt" timestamptz,
    "externalUpdateAt" timestamptz,

    "problemOrderTypes" varchar(256)[],

    "createAt" timestamptz,
    "payAt" timestamptz,
    "purchasedOn" timestamptz,
    "closeAt" timestamptz,
    "lastUpdateAt" timestamptz,
    "promisedToShipBefore" timestamptz,

    "totalQuantity" bigint,
    "customerName" text
  `);

    // ✅ SELECT buat insert: semua incoming cols + now() sebagai updatedAt
    const selectIncomingColsSql = Prisma.raw(
      [...insertCols.map((c) => `incoming.${q(c)}`), 'now()'].join(', '),
    );

    const result = await tx.$queryRaw<Array<{ orderId: string }>>(Prisma.sql`
  WITH incoming_raw AS (
    SELECT *
    FROM jsonb_to_recordset(${rowsJson}::jsonb)
    AS incoming(${recordsetColumns})
  ),
  incoming AS (
    SELECT DISTINCT ON ("orderId") *
    FROM incoming_raw
    ORDER BY "orderId", "lastUpdateAt" DESC NULLS LAST
  ),
  upserted AS (
    INSERT INTO "GineeOrderMaster" (${insertColsSql})
    SELECT ${selectIncomingColsSql}
    FROM incoming
    ON CONFLICT ("orderId")
    DO UPDATE SET
      ${setSql}
    WHERE
      "GineeOrderMaster"."lastUpdateAt" IS NULL
      OR EXCLUDED."lastUpdateAt" > "GineeOrderMaster"."lastUpdateAt"
    RETURNING "orderId"
  )
  SELECT "orderId" FROM upserted;
`);

    return result.map((r) => r.orderId);
  }

  async massUpdate2(
    orders: unknown[],
    tx: Prisma.TransactionClient,
  ): Promise<{
    orderIdsApplied: string[];
    stats: {
      totalIncoming: number;
      totalInserted: number;
      totalUpdated: number;
      totalSkipped: number;
    };
  }> {
    const insertCols = [...ALLOWED_KEYS];
    const updateCols = [...UPDATABLE_KEYS].filter((c) => c !== 'orderId');

    const q = (c: string): string => `"${c.replaceAll('"', '""')}"`;

    const insertColsWithAudit = [...insertCols, 'updatedAt'];
    const insertColsSql = Prisma.raw(insertColsWithAudit.map(q).join(', '));

    const setSql = Prisma.raw(
      [
        ...updateCols.map((c) => `${q(c)} = EXCLUDED.${q(c)}`),
        `"updatedAt" = now()`,
      ].join(',\n'),
    );

    const rows: Record<string, unknown>[] = (orders ?? []).map((o) =>
      pickAllowedFields((o ?? {}) as Record<string, unknown>, ALLOWED_KEYS),
    );

    if (rows.length === 0) {
      return {
        orderIdsApplied: [],
        stats: {
          totalIncoming: 0,
          totalInserted: 0,
          totalUpdated: 0,
          totalSkipped: 0,
        },
      };
    }

    const rowsJson: string = JSON.stringify(rows);

    const recordsetColumns = Prisma.raw(`
    "orderId" text,
    "country" text,
    "channel" text,
    "shopId" text,

    "orderType" text,
    "orderStatus" text,
    "currency" text,

    "totalAmount" numeric,
    "paymentMethod" text,
    "isCod" boolean,

    "externalShopId" text,
    "externalOrderId" text,
    "externalOrderSn" text,
    "externalBookingSn" text,
    "externalOrderStatus" text,
    "externalCreateAt" timestamptz,
    "externalUpdateAt" timestamptz,

    "problemOrderTypes" varchar(256)[],

    "createAt" timestamptz,
    "payAt" timestamptz,
    "purchasedOn" timestamptz,
    "closeAt" timestamptz,
    "lastUpdateAt" timestamptz,
    "promisedToShipBefore" timestamptz,

    "totalQuantity" bigint,
    "customerName" text
  `);

    const selectIncomingColsSql = Prisma.raw(
      [...insertCols.map((c) => `incoming.${q(c)}`), 'now()'].join(', '),
    );

    type Row = {
      orderId: string;
      inserted: boolean;
      totalIncoming: bigint;
      totalInserted: bigint;
      totalUpdated: bigint;
      totalApplied: bigint;
      totalSkipped: bigint;
    };

    const res = await tx.$queryRaw<Row[]>(Prisma.sql`
    WITH incoming_raw AS (
      SELECT *
      FROM jsonb_to_recordset(${rowsJson}::jsonb)
      AS incoming(${recordsetColumns})
    ),
    incoming AS (
      SELECT DISTINCT ON ("orderId") *
      FROM incoming_raw
      ORDER BY "orderId", "lastUpdateAt" DESC NULLS LAST
    ),
    stats_incoming AS (
      SELECT COUNT(*)::bigint AS total_incoming FROM incoming
    ),
    upserted AS (
      INSERT INTO "GineeOrderMaster" (${insertColsSql})
      SELECT ${selectIncomingColsSql}
      FROM incoming
      ON CONFLICT ("orderId")
      DO UPDATE SET
        ${setSql}
      WHERE
        "GineeOrderMaster"."lastUpdateAt" IS NULL
        OR EXCLUDED."lastUpdateAt" > "GineeOrderMaster"."lastUpdateAt"
      RETURNING
        "orderId",
        (xmax = 0) AS inserted
    ),
    stats_upserted AS (
      SELECT
        COUNT(*) FILTER (WHERE inserted)::bigint AS total_inserted,
        COUNT(*) FILTER (WHERE NOT inserted)::bigint AS total_updated,
        COUNT(*)::bigint AS total_applied
      FROM upserted
    ),
    stats_all AS (
      SELECT
        si.total_incoming,
        su.total_inserted,
        su.total_updated,
        su.total_applied,
        (si.total_incoming - su.total_applied)::bigint AS total_skipped
      FROM stats_incoming si
      CROSS JOIN stats_upserted su
    )
    SELECT
      u."orderId",
      u.inserted,
      sa.total_incoming AS "totalIncoming",
      sa.total_inserted AS "totalInserted",
      sa.total_updated AS "totalUpdated",
      sa.total_applied AS "totalApplied",
      sa.total_skipped AS "totalSkipped"
    FROM upserted u
    CROSS JOIN stats_all sa;
  `);

    // kalau semua skipped -> upserted kosong -> res kosong -> ambil stats doang (query fallback kamu)
    if (res.length === 0) {
      const statsOnly = await tx.$queryRaw<
        Array<{
          totalIncoming: bigint;
          totalInserted: bigint;
          totalUpdated: bigint;
          totalApplied: bigint;
          totalSkipped: bigint;
        }>
      >(Prisma.sql`
      WITH incoming_raw AS (
        SELECT *
        FROM jsonb_to_recordset(${rowsJson}::jsonb)
        AS incoming(${recordsetColumns})
      ),
      incoming AS (
        SELECT DISTINCT ON ("orderId") *
        FROM incoming_raw
        ORDER BY "orderId", "lastUpdateAt" DESC NULLS LAST
      ),
      stats_incoming AS (
        SELECT COUNT(*)::bigint AS total_incoming FROM incoming
      )
      SELECT
        total_incoming AS "totalIncoming",
        0::bigint AS "totalInserted",
        0::bigint AS "totalUpdated",
        0::bigint AS "totalApplied",
        total_incoming::bigint AS "totalSkipped"
      FROM stats_incoming;
    `);

      const s = statsOnly[0];

      return {
        orderIdsApplied: [],
        stats: {
          totalIncoming: Number(s?.totalIncoming ?? 0n),
          totalInserted: Number(s?.totalInserted ?? 0n),
          totalUpdated: Number(s?.totalUpdated ?? 0n),
          totalSkipped: Number(s?.totalSkipped ?? 0n),
        },
      };
    }

    const first = res[0];

    return {
      orderIdsApplied: res.map((r) => r.orderId),
      stats: {
        totalIncoming: Number(first.totalIncoming),
        totalInserted: Number(first.totalInserted),
        totalUpdated: Number(first.totalUpdated),
        totalSkipped: Number(first.totalSkipped),
      },
    };
  }
}
