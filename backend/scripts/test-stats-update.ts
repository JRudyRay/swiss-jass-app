/**
 * Direct test of stats update functions
 */
import { updateStatsForMatch, updateUserStats } from '../src/services/gameService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing stats update functions\n');

  // Test user IDs from actual DB
  const alice = 'cmgcg01al0003v8moix1nct46';
  const bob = 'cmgcg01al0000v8mozodmfciz';
  const testbot = 'cmgcghy660002v80sp8q61yyz';

  // Get initial stats
  console.log('📊 Initial stats:');
  const before = await prisma.user.findMany({
    where: { id: { in: [alice, bob, testbot] } },
    select: { username: true, totalGames: true, totalWins: true, isBot: true }
  });
  console.log(JSON.stringify(before, null, 2));

  console.log('\n🧪 Test 1: updateStatsForMatch with isMultiplayer=false');
  console.log('Expected: Should skip (offline game)');
  const result1 = await updateStatsForMatch([alice], [bob], 100, 80, 5, false);
  console.log(`Result: ${result1}`);

  const after1 = await prisma.user.findUnique({
    where: { id: alice },
    select: { username: true, totalGames: true }
  });
  console.log(`Alice stats: ${JSON.stringify(after1)}`);

  console.log('\n🧪 Test 2: updateStatsForMatch with isMultiplayer=true');
  console.log('Expected: Should update stats');
  const result2 = await updateStatsForMatch([alice], [bob], 100, 80, 5, true);
  console.log(`Result: ${result2}`);

  const after2 = await prisma.user.findMany({
    where: { id: { in: [alice, bob] } },
    select: { username: true, totalGames: true, totalWins: true }
  });
  console.log(`Stats after multiplayer: ${JSON.stringify(after2, null, 2)}`);

  console.log('\n🧪 Test 3: updateStatsForMatch with bot player');
  console.log('Expected: Should skip bot stats');
  const result3 = await updateStatsForMatch([testbot], [bob], 100, 80, 5, true);
  console.log(`Result: ${result3}`);

  const after3 = await prisma.user.findUnique({
    where: { id: testbot },
    select: { username: true, totalGames: true, isBot: true }
  });
  console.log(`Bot stats: ${JSON.stringify(after3)}`);

  console.log('\n✅ All tests complete!');
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    prisma.$disconnect();
  });
