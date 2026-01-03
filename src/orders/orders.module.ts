import { Module } from '@nestjs/common';
import { GineeOrderItemService } from './ginee_order_item.service';
import { GineeOrderMasterService } from './ginee_order_master.service';
import { GineeOrderDetailService } from './ginee_order_detail.service';

@Module({
  providers: [
    GineeOrderMasterService,
    GineeOrderItemService,
    GineeOrderDetailService,
  ],
  exports: [
    GineeOrderMasterService,
    GineeOrderItemService,
    GineeOrderDetailService,
  ],
})
export class OrdersModule {}
