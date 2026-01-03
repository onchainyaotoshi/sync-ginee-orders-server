import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { pickAllowedFields } from 'src/common/utils/collections';

const ALLOWED_KEYS = new Set<string>([
  // ===== Identity =====
  'id',
  'orderId',
  'jobMasterId',
  'invoiceInfo',
  'shippingDocumentInfo',
  'shipInfo',
  'printInfo',
  'extraInfo',
  'cancelInfo',
  'logisticsInfos',
  'shippingAddressInfo',
  'paymentInfo',
  'customerInfo',
]);

@Injectable()
export class GineeOrderDetailService {
  // eslint-disable-next-line prettier/prettier
  constructor(private readonly prisma: PrismaService) { }

  async bulks(rows: Prisma.GineeOrderDetailCreateManyInput[]): Promise<number> {
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
}
