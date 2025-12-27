import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma.module';

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
    PrismaModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
