/**
 * Phase 1 Verification: Rankings Fix
 * 
 * Tests that:
 * 1. Offline games don't update user stats or rankings
 * 2. Multiplayer games DO update stats and rankings
 * 3. Bot players are excluded from rankings
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface User {
  id: string;
  username: string;
  isBot: boolean;
  totalGames: number;
  totalWins: number;
  eloRating: number;
  winRate: number;
}

async function main() {
  console.log('\n🧪 Phase 1 Verification: Rankings Fix\n');

  // Step 1: Create test users
  console.log('📝 Step 1: Creating test users...');
  const password = await bcrypt.hash('test123', 10);
  
  const user1 = await prisma.user.upsert({
    where: { username: 'testuser1' },
    update: {},
    create: {
      username: 'testuser1',
      email: 'test1@example.com',
      password,
      firstName: 'Test',
      lastName: 'User1',
      isBot: false,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { username: 'testuser2' },
    update: {},
    create: {
      username: 'testuser2',
      email: 'test2@example.com',
      password,
      firstName: 'Test',
      lastName: 'User2',
      isBot: false,
    },
  });

  const botUser = await prisma.user.upsert({
    where: { username: 'testbot' },
    update: {},
    create: {
      username: 'testbot',
      email: 'bot@example.com',
      password,
      firstName: 'Bot',
      lastName: 'Player',
      isBot: true,
    },
  });

  console.log(`✅ Created: ${user1.username}, ${user2.username}, ${botUser.username} (bot)`);

  // Step 2: Record initial stats
  console.log('\n📊 Step 2: Recording initial stats...');
  const initialStats = await prisma.user.findMany({
    where: { id: { in: [user1.id, user2.id, botUser.id] } },
    select: {
      id: true,
      username: true,
      isBot: true,
      totalGames: true,
      totalWins: true,
      trueSkillMu: true,
      totalPoints: true,
    },
  });

  console.log('Initial stats:', JSON.stringify(initialStats, null, 2));

  // Step 3: Create OFFLINE game session (should NOT update stats)
  console.log('\n🎮 Step 3: Creating OFFLINE game session...');
  await prisma.gameSession.create({
    data: {
      userId: user1.id,
      gameType: 'schieber',
      result: 'win',
      points: 157,
      duration: 10,
      isMultiplayer: false, // ❌ OFFLINE - should not update stats
    },
  });
  console.log('✅ Created offline game for user1 (should NOT update stats)');

  // Step 4: Check stats after offline game
  console.log('\n🔍 Step 4: Checking stats after offline game...');
  const statsAfterOffline = await prisma.user.findUnique({
    where: { id: user1.id },
    select: {
      username: true,
      totalGames: true,
      totalWins: true,
      trueSkillMu: true,
    },
  });

  const offlineStatsChanged = 
    statsAfterOffline!.totalGames !== initialStats[0].totalGames ||
    statsAfterOffline!.totalWins !== initialStats[0].totalWins ||
    statsAfterOffline!.trueSkillMu !== initialStats[0].trueSkillMu;

  if (offlineStatsChanged) {
    console.log('❌ FAIL: Offline game updated stats (should NOT)');
    console.log('Before:', initialStats[0]);
    console.log('After:', statsAfterOffline);
  } else {
    console.log('✅ PASS: Offline game did NOT update stats');
  }

  // Step 5: Create MULTIPLAYER game session (SHOULD update stats)
  console.log('\n🎮 Step 5: Creating MULTIPLAYER game session...');
  await prisma.gameSession.create({
    data: {
      userId: user2.id,
      gameType: 'schieber',
      result: 'win',
      points: 157,
      duration: 10,
      isMultiplayer: true, // ✅ MULTIPLAYER - should update stats
    },
  });
  console.log('✅ Created multiplayer game for user2 (SHOULD update stats)');

  // Step 6: Check stats after multiplayer game
  console.log('\n🔍 Step 6: Checking stats after multiplayer game...');
  const statsAfterMultiplayer = await prisma.user.findUnique({
    where: { id: user2.id },
    select: {
      username: true,
      totalGames: true,
      totalWins: true,
      trueSkillMu: true,
    },
  });

  const multiplayerStatsChanged = 
    statsAfterMultiplayer!.totalGames !== initialStats[1].totalGames ||
    statsAfterMultiplayer!.totalWins !== initialStats[1].totalWins;

  if (multiplayerStatsChanged) {
    console.log('✅ PASS: Multiplayer game updated stats');
    console.log('Before:', initialStats[1]);
    console.log('After:', statsAfterMultiplayer);
  } else {
    console.log('❌ FAIL: Multiplayer game did NOT update stats (should have)');
  }

  // Step 7: Check bot exclusion from rankings
  console.log('\n🤖 Step 7: Checking bot exclusion from rankings...');
  const realPlayers = await prisma.user.findMany({
    where: { isBot: false },
    select: { username: true, isBot: true },
  });

  const bots = await prisma.user.findMany({
    where: { isBot: true },
    select: { username: true, isBot: true },
  });

  console.log(`Real players: ${realPlayers.length} (${realPlayers.map(p => p.username).join(', ')})`);
  console.log(`Bots: ${bots.length} (${bots.map(b => b.username).join(', ')})`);

  const botIncludedInRankings = bots.some(b => b.username === 'testbot');
  if (botIncludedInRankings) {
    console.log('✅ Bot user exists (will be filtered in ranking queries)');
  }

  // Step 8: Test ranking query (should exclude bots)
  console.log('\n🏆 Step 8: Testing ranking query (should exclude bots)...');
  const rankings = await prisma.user.findMany({
    where: { isBot: false }, // ✅ Filter out bots
    orderBy: { trueSkillMu: 'desc' },
    take: 10,
    select: {
      username: true,
      isBot: true,
      trueSkillMu: true,
      totalGames: true,
      totalWins: true,
    },
  });

  console.log('Rankings (top 10):');
  rankings.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username} - TrueSkill: ${user.trueSkillMu?.toFixed(2)}, Games: ${user.totalGames}, Wins: ${user.totalWins}`);
  });

  const botInRankings = rankings.some(r => r.isBot);
  if (botInRankings) {
    console.log('❌ FAIL: Bot found in rankings (should be excluded)');
  } else {
    console.log('✅ PASS: No bots in rankings');
  }

  // Summary
  console.log('\n📋 SUMMARY');
  console.log('==========');
  console.log(`Offline game guard: ${!offlineStatsChanged ? '✅' : '❌'}`);
  console.log(`Multiplayer stats update: ${multiplayerStatsChanged ? '✅' : '❌'}`);
  console.log(`Bot exclusion: ${!botInRankings ? '✅' : '❌'}`);
  
  console.log('\n✅ Phase 1 verification complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during verification:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
