// Seed script for Swiss Jass backend
// Creates minimal test data - NO game results, NO bot users in rankings
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash a standard test password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create test users (real human accounts only)
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@test.com' },
      update: {},
      create: {
        email: 'alice@test.com',
        username: 'alice',
        password: hashedPassword,
        firstName: 'Alice',
        lastName: 'Müller',
        country: 'CH',
        city: 'Zürich',
        isBot: false,
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@test.com' },
      update: {},
      create: {
        email: 'bob@test.com',
        username: 'bob',
        password: hashedPassword,
        firstName: 'Bob',
        lastName: 'Schmidt',
        country: 'CH',
        city: 'Bern',
        isBot: false,
      },
    }),
    prisma.user.upsert({
      where: { email: 'charlie@test.com' },
      update: {},
      create: {
        email: 'charlie@test.com',
        username: 'charlie',
        password: hashedPassword,
        firstName: 'Charlie',
        lastName: 'Weber',
        country: 'CH',
        city: 'Basel',
        isBot: false,
      },
    }),
    prisma.user.upsert({
      where: { email: 'diana@test.com' },
      update: {},
      create: {
        email: 'diana@test.com',
        username: 'diana',
        password: hashedPassword,
        firstName: 'Diana',
        lastName: 'Fischer',
        country: 'CH',
        city: 'Lausanne',
        isBot: false,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} test users`);
  console.log('📧 Test accounts (all with password: "password123"):');
  users.forEach((u) => console.log(`   - ${u.username} (${u.email})`));

  // DO NOT create bot users here
  // They are created on-demand by tableService.ts when filling seats
  // and are flagged with isBot=true to exclude from rankings

  console.log('\n✅ Seed completed!');
  console.log('ℹ️  Note: Bot users are created automatically when needed');
  console.log('ℹ️  No game results seeded - rankings start fresh');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
