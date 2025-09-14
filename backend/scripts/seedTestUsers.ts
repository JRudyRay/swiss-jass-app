import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'alice@example.com', username: 'alice', password: 'swiss123' },
    { email: 'bob@example.com', username: 'bob', password: 'swiss123' }
  ];
  for (const u of users) {
    const existing = await prisma.user.findFirst({ where: { OR: [{ email: u.email }, { username: u.username }] } });
    const hashed = await bcrypt.hash(u.password, 12);
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { password: hashed } });
      console.log(`Updated password for ${u.username}`);
    } else {
      await prisma.user.create({ data: { email: u.email, username: u.username, password: hashed } });
      console.log(`Created user ${u.username}`);
    }
  }
}

main().then(()=>prisma.$disconnect());
