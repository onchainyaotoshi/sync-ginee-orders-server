import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { OrdersModule } from 'src/orders/orders.module';
import { IncrementalSyncHistoryService } from './incremental_sync_history';

@Module({
  imports: [OrdersModule],
  providers: [JobsService, IncrementalSyncHistoryService],
  exports: [JobsService, IncrementalSyncHistoryService],
})
export class JobsModule {}
