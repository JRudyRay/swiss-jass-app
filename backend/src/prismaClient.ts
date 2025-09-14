import { PrismaClient } from '@prisma/client';

// Ensure single instance in dev (nodemon reload safeguard)
const globalForPrisma = global as any;
export const prisma: PrismaClient = globalForPrisma.__prisma || new PrismaClient();
if (!globalForPrisma.__prisma) globalForPrisma.__prisma = prisma;

export default prisma;
