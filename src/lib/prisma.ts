import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient | undefined {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return undefined;

  const adapter = new PrismaMariaDb(url);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient | undefined =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
