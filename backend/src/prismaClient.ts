import { PrismaClient } from '@prisma/client';

const g: any = global;
if (!g.__prisma) {
	g.__prisma = new PrismaClient();
}
const prisma: PrismaClient = g.__prisma;
export { prisma };
export default prisma;
