import path from 'node:path';
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// prisma.config.ts — diperlukan oleh Prisma 7.
// datasource.url dibutuhkan oleh perintah migrate/introspection;
// runtime client memakai adapter PrismaPg di PrismaService.
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },
});
