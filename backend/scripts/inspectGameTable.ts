import { PrismaClient } from '@prisma/client';
import fs from 'fs';

(async () => {
  const prisma = new PrismaClient();
  try {
    // Direct raw query to list columns from sqlite pragma
    const cols = await prisma.$queryRawUnsafe<any[]>("PRAGMA table_info('GameTable')");
    console.log('GameTable columns:', cols.map(c=>c.name));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
