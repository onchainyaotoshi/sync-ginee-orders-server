import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { pickAllowedFields } from 'src/common/utils/collections';

const ALLOWED_KEYS = new Set<string>([
  // ===== Identity =====
  'itemId',
  'orderId',
  'jobMasterId',

  // ===== Product info =====
  'productName',
  'productImageUrl',
  'variationName',

  'spu',
  'sku',
  'masterSku',
  'masterSkuType',

  // ===== Quantity & pricing =====
  'quantity',
  'actualPrice',
  'actualTotalPrice',
  'originalPrice',
  'originalTotalPrice',
  'discountedPrice',

  // ===== External ids / status =====
  'externalItemId',
  'externalVariationId',
  'externalProductId',
  'externalOrderItemStatus',

  // ===== Flags =====
  'isGift',
  'isFulfilByPlatform',

  // ===== JSON payloads =====
  'bundleSkus',
]);

@Injectable()
export class GineeOrderItemService {
  // eslint-disable-next-line prettier/prettier
  constructor(private readonly prisma: PrismaService) { }

  async bulks(rows: Prisma.GineeOrderItemCreateManyInput[]): Promise<number> {
    // optional: buang key liar (kalau kamu masih butuh)
    const data: Prisma.GineeOrderItemCreateManyInput[] = rows.map((r) => {
      const filtered = pickAllowedFields(
        r as Record<string, unknown>,
        ALLOWED_KEYS,
      );

      // pastiin output bertipe Prisma input
      return filtered as Prisma.GineeOrderItemCreateManyInput;
    });

    const result = await this.prisma.gineeOrderItem.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  }
  async countDistinctOrderIdsByJobMasterId(
    jobMasterId: bigint,
  ): Promise<number> {
    const rows = await this.prisma.gineeOrderItem.findMany({
      where: { jobMasterId },
      select: { orderId: true },
      distinct: ['orderId'],
    });

    return rows.length;
  }
}
