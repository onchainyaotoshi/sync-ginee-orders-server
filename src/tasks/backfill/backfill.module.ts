import { Module } from '@nestjs/common';
import { JobsModule } from 'src/jobs/jobs.module';
import { ScheduleService } from './schedule.service';
import { DispatchService } from './dispatch.service';
import { ExtractOrderMasterService } from './extract.order.master.service';
import { ExtractOrderItemsService } from './extract.order.items.service';

@Module({
  imports: [JobsModule],
  providers: [
    ScheduleService,
    DispatchService,
    ExtractOrderMasterService,
    ExtractOrderItemsService,
  ],
})
export class BackFillModule {}
