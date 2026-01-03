import { Module } from '@nestjs/common';
import { JobsModule } from 'src/jobs/jobs.module';
import { ScheduleService } from './schedule.service';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports: [JobsModule, OrdersModule],
  providers: [ScheduleService],
})
export class SyncModule {}
