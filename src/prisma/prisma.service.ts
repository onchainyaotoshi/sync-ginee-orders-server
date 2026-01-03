import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// tipe event minimal strict (tanpa any)
// type QueryEventLike = { query: string; params: string; duration: number };
// type LogEventLike = { message: string };

@Injectable()
export class PrismaService extends PrismaClient {
  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL');
    if (!url) throw new Error('DATABASE_URL is missing');

    const adapter = new PrismaPg({ connectionString: url });

    super({
      adapter,
      // log: [
      //   { level: 'query', emit: 'event' },
      //   { level: 'error', emit: 'event' },
      //   { level: 'warn', emit: 'event' },
      // ],
    });

    // // 👇 Cast supaya TS gak anggap $on(eventName) = never
    // const client = this as unknown as {
    //   $on(eventName: 'query', cb: (e: QueryEventLike) => void): void;
    //   $on(eventName: 'error' | 'warn', cb: (e: LogEventLike) => void): void;
    // };

    // client.$on('query', (e) => {
    //   console.log('--- PRISMA QUERY ---');
    //   console.log(e.query);
    //   console.log('params:', e.params);
    //   console.log('duration:', e.duration, 'ms');
    // });

    // client.$on('error', (e) => {
    //   console.log('--- PRISMA ERROR ---');
    //   console.log(e.message);
    // });

    // client.$on('warn', (e) => {
    //   console.log('--- PRISMA WARN ---');
    //   console.log(e.message);
    // });
  }
}
