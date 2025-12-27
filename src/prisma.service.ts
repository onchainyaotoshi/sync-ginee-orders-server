import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL');
    if (!url) throw new Error('DATABASE_URL is missing');

    const adapter = new PrismaPg({
      connectionString: url,
    });
    super({ adapter });
  }
}
