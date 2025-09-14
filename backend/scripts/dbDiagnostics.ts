import { PrismaClient } from '@prisma/client';
(async () => {
  const prisma = new PrismaClient();
  try {
    const dbList = await prisma.$queryRawUnsafe<any[]>("PRAGMA database_list;");
    console.log('Database list:', dbList);
    const tableInfo = await prisma.$queryRawUnsafe<any[]>("PRAGMA table_info('GameTable');");
    console.log('GameTable columns full info:', tableInfo);
    const sample = await prisma.$queryRawUnsafe<any[]>("SELECT * FROM GameTable LIMIT 1;");
    console.log('Sample row GameTable (if any):', sample);
  } catch (e) {
    console.error('Diagnostics error', e);
  } finally {
    await prisma.$disconnect();
  }
})();
