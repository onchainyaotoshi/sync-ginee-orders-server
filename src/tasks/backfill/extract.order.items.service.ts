import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from 'src/jobs/jobs.service';
import { GineeService } from 'src/ginee/ginee.service';
import { JobMaster } from 'src/generated/prisma/client';
import { serializeError } from 'src/common/utils/error';
import { GineeOrderMasterService } from 'src/orders/ginee_order_master.service';
import { GineeOrderItemService } from 'src/orders/ginee_order_item.service';
import { GineeOrderDetailService } from 'src/orders/ginee_order_detail.service';

@Injectable()
export class ExtractOrderItemsService {
  private readonly logger = new Logger(ExtractOrderItemsService.name);

  constructor(
    private readonly job: JobsService,
    private readonly ginee: GineeService,
    private readonly orderMaster: GineeOrderMasterService,
    private readonly orderItem: GineeOrderItemService,
    private readonly orderDetail: GineeOrderDetailService,
    // eslint-disable-next-line prettier/prettier
  ) { }

  @Cron(CronExpression.EVERY_MINUTE, { timeZone: 'Asia/Jakarta' })
  async extractOrderItems(): Promise<void> {
    const jobs = await this.job.getConsensusReachedJobs();
    for (const job of jobs) {
      await this.fetchGineeOrderDetails(job);

      await new Promise((r) => setTimeout(r, 5000)); // kasih jeda 5 detik antar job
    }
  }

  private async fetchGineeOrderDetails(job: JobMaster) {
    try {
      const BATCH_SIZE = 100;

      for (;;) {
        // 1️⃣ ambil orderId yang belum punya item
        const orderIds = await this.orderMaster.getOrderIdsWithoutItems(
          job.id,
          BATCH_SIZE,
        );

        if (!orderIds.length) {
          const totalOrderIds =
            await this.orderItem.countDistinctOrderIdsByJobMasterId(job.id);
          if (totalOrderIds.toString() == job.consensusKey) {
            await this.job.updateStatusToDetailFetched(job.id);
          }
          break; // ✅ selesai
        }

        // 2️⃣ fetch detail dari Ginee
        const resp =
          await this.ginee.client.orders.getDetailsByOrderIds(orderIds);

        // 3️⃣ build items (flatten)
        const items: any[] = [];
        const details: any[] = [];

        for (const o of resp) {
          if (!o.items?.length) continue;

          for (const item of o.items) {
            items.push({
              orderId: o.orderId,
              jobMasterId: job.id,
              ...item,
            });

            details.push({
              orderId: o.orderId,
              jobMasterId: job.id,
              invoiceInfo: o.invoiceInfo,
              shippingDocumentInfo: o.shippingDocumentInfo,
              shipInfo: o.shipInfo,
              printInfo: o.printInfo,
              extraInfo: o.extraInfo,
              cancelInfo: o.cancelInfo,
              logisticsInfos: o.logisticsInfos,
              shippingAddressInfo: o.shippingAddressInfo,
              paymentInfo: o.paymentInfo,
              customerInfo: o.customerInfo,
            });
          }
        }

        // 4️⃣ insert kalau ada
        if (items.length) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          await this.orderItem.bulks(items);
          await this.orderDetail.bulks(details);
        }

        // 5️⃣ delay antar batch (rate limit safety)
        await new Promise((r) => setTimeout(r, 5_000));
      }
    } catch (err: unknown) {
      await this.job.setErrorOnJobMaster(job.id, serializeError(err));
    }
  }
}
