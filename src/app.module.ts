import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        switch (process.env.NODE_ENV) {
          case 'production':
            return '.env';
          default:
            return '.env.dev';
        }
      })(),
    }),
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
