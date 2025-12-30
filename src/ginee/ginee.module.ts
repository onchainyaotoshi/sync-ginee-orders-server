import { Global, Module } from '@nestjs/common';
import { GineeService } from './ginee.service';

@Global()
@Module({
  providers: [GineeService],
  exports: [GineeService],
})
export class GineeModule {}
