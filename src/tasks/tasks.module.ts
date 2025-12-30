import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  providers: [TasksService],
})
export class TasksModule {}
