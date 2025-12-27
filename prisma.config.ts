import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV ?? 'development';

// pilih file env berdasarkan NODE_ENV
dotenv.config({
  path: nodeEnv === 'production' ? '.env' : '.env.dev',
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
