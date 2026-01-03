import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
// import { BackFillModule } from './backfill/backfill.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [ScheduleModule.forRoot(), SyncModule],
})
export class TasksModule {}
