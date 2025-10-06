// Minimal auth-only game service for Railway deployment
import { PrismaClient } from '@prisma/client';
// Import TrueSkill dynamically to avoid TS typing issues until we run prisma generate/migrate
// Use the TypeScript-friendly implementation which exports TrueSkill and Rating
const trueskillAny: any = require('ts-trueskill');
// Normalize possible export shapes: ts-trueskill exports { TrueSkill, Rating }
const TrueSkillClass = trueskillAny.TrueSkill || trueskillAny.default?.TrueSkill || trueskillAny;
const RatingClass = trueskillAny.Rating || trueskillAny.default?.Rating || TrueSkillClass?.Rating || trueskillAny;

const prisma = new PrismaClient();

// ✅ Helper: Filter out bot players from team arrays
async function filterRealPlayers(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  
  const realUsers = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      isBot: false  // Only real players
    },
    select: { id: true }
  });
  
  return realUsers.map(u => u.id);
}

export class GameService {
  // Simple user stats update - kept for compatibility
  static async updateUserStats(userId: string, won: boolean, points: number) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalGames: { increment: 1 },
          totalWins: won ? { increment: 1 } : undefined,
          totalPoints: { increment: points },
        }
      });
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  // Simple game session logging
  static async logGameSession(userId: string, result: string, points: number, isMultiplayer: boolean = false) {
    try {
      await prisma.gameSession.create({
        data: {
          userId,
          gameType: 'schieber',
          result,
          points,
          duration: 30, // default duration
          isMultiplayer  // NEW: Track game mode
        }
      });
    } catch (error) {
      console.error('Error logging game session:', error);
    }
  }
}

// ✅ Update stats for a match between two teams
// Only updates stats if isMultiplayer=true and excludes bot players
export async function updateStatsForMatch(
  teamA: string[], 
  teamB: string[], 
  scoreA: number, 
  scoreB: number, 
  rounds = 0,
  isMultiplayer: boolean = false  // NEW PARAMETER
) {
  try {
    // ✅ GUARD #1: Skip offline games entirely
    if (!isMultiplayer) {
      console.log('⏭️  Skipping stats update for offline game');
      return false;
    }

    // ✅ GUARD #2: Filter out bot players
    const realTeamA = await filterRealPlayers(teamA);
    const realTeamB = await filterRealPlayers(teamB);

    if (realTeamA.length === 0 && realTeamB.length === 0) {
      console.log('⏭️  Skipping stats update: all players are bots');
      return false;
    }

    // ✅ GUARD #3: Skip if one team has no players (TrueSkill requires both teams)
    if (realTeamA.length === 0 || realTeamB.length === 0) {
      console.warn('⚠️  One team has no human players - skipping TrueSkill update');
      return false;
    }

    // Fetch current ratings (only for real players)
    const allPlayerIds = [...realTeamA, ...realTeamB];
    const users = await prisma.user.findMany({ 
      where: { 
        id: { in: allPlayerIds },
        isBot: false  // Double-check filter
      } 
    });
    const usersById: Record<string, any> = {};
    for (const u of users) usersById[u.id] = u;

    // Build TrueSkill ratings
  const env = new TrueSkillClass();
    // Prepare teams as arrays of rating objects
    const teamARatings = realTeamA.map(id => {
      const u = usersById[id];
      const mu = typeof u?.trueSkillMu === 'number' ? u.trueSkillMu : 25.0;
      const sigma = typeof u?.trueSkillSigma === 'number' ? u.trueSkillSigma : 8.333;
  // construct via normalized RatingClass
  return new RatingClass(mu, sigma);
    });
    const teamBRatings = realTeamB.map(id => {
      const u = usersById[id];
      const mu = typeof u?.trueSkillMu === 'number' ? u.trueSkillMu : 25.0;
      const sigma = typeof u?.trueSkillSigma === 'number' ? u.trueSkillSigma : 8.333;
  return new RatingClass(mu, sigma);
    });

    // Determine ranks: 0 = winner, 1 = loser
    const teamARank = scoreA > scoreB ? 0 : 1;
    const teamBRank = scoreB > scoreA ? 0 : 1;

    const [newTeamA, newTeamB] = env.rate([teamARatings, teamBRatings], [teamARank, teamBRank]);

    // Persist updates and increment stats
    const tx = await prisma.$transaction(async (prismaTx) => {
      const updates: Promise<any>[] = [];

      // Team A updates (only real players)
      for (let i = 0; i < realTeamA.length; i++) {
        const id = realTeamA[i];
        const newRating = newTeamA[i];
        const won = teamARank === 0;
        updates.push(prismaTx.user.update({ where: { id }, data: ({
          totalGames: { increment: 1 },
          totalWins: won ? { increment: 1 } : undefined,
          totalPoints: { increment: Math.round((won ? 3 : 0)) },
          trueSkillMu: newRating.mu,
          trueSkillSigma: newRating.sigma
        } as any) }));
        updates.push(prismaTx.gameSession.create({ data: { userId: id, gameType: 'schieber', result: won ? 'win' : 'loss', points: Math.round((won ? 3 : 0)), duration: rounds * 2, isMultiplayer: true } }));
      }

      // Team B updates (only real players)
      for (let i = 0; i < realTeamB.length; i++) {
        const id = realTeamB[i];
        const newRating = newTeamB[i];
        const won = teamBRank === 0;
        updates.push(prismaTx.user.update({ where: { id }, data: ({
          totalGames: { increment: 1 },
          totalWins: won ? { increment: 1 } : undefined,
          totalPoints: { increment: Math.round((won ? 3 : 0)) },
          trueSkillMu: newRating.mu,
          trueSkillSigma: newRating.sigma
        } as any) }));
        updates.push(prismaTx.gameSession.create({ data: { userId: id, gameType: 'schieber', result: won ? 'win' : 'loss', points: Math.round((won ? 3 : 0)), duration: rounds * 2, isMultiplayer: true } }));
      }

      await Promise.all(updates);
    });

    console.log(`✅ Updated stats for ${realTeamA.length + realTeamB.length} players (multiplayer game)`);
    return true;
  } catch (error) {
    console.error('Error updating match stats:', error);
    throw error;
  }
}

// Backwards-compatible function used by routes expecting single-user update
export async function updateUserStats(
  userId: string, 
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalPoints: number;
    totalRounds: number;
  },
  isMultiplayer: boolean = false  // NEW PARAMETER
) {
  try {
    // ✅ GUARD: Skip offline games
    if (!isMultiplayer) {
      console.log(`⏭️  Skipping stats update for user ${userId} (offline game)`);
      return;
    }

    // ✅ GUARD: Check if user is a bot
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBot: true } });
    if (user?.isBot) {
      console.log(`⏭️  Skipping stats update for bot user ${userId}`);
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        totalGames: { increment: stats.gamesPlayed },
        totalWins: { increment: stats.gamesWon },
        totalPoints: { increment: stats.totalPoints },
      }
    });

    await prisma.gameSession.create({
      data: {
        userId,
        gameType: 'schieber',
        result: stats.gamesWon > 0 ? 'win' : 'loss',
        points: stats.totalPoints,
        duration: stats.totalRounds * 2,
        isMultiplayer: true  // ✅ Mark as multiplayer
      }
    });

    console.log(`✅ Updated stats for user ${userId} (multiplayer game)`);
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
}
