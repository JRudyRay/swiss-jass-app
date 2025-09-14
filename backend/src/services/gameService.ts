// Minimal auth-only game service for Railway deployment
import { PrismaClient } from '@prisma/client';
// Import TrueSkill dynamically to avoid TS typing issues until we run prisma generate/migrate
// Use the TypeScript-friendly implementation which exports TrueSkill and Rating
const trueskillAny: any = require('ts-trueskill');
// Normalize possible export shapes: ts-trueskill exports { TrueSkill, Rating }
const TrueSkillClass = trueskillAny.TrueSkill || trueskillAny.default?.TrueSkill || trueskillAny;
const RatingClass = trueskillAny.Rating || trueskillAny.default?.Rating || TrueSkillClass?.Rating || trueskillAny;

const prisma = new PrismaClient();

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
  static async logGameSession(userId: string, result: string, points: number) {
    try {
      await prisma.gameSession.create({
        data: {
          userId,
          gameType: 'schieber',
          result,
          points,
          duration: 30 // default duration
        }
      });
    } catch (error) {
      console.error('Error logging game session:', error);
    }
  }
}

// Update stats for a match between two teams. Accept arrays of userIds for teamA and teamB.
export async function updateStatsForMatch(teamA: string[], teamB: string[], scoreA: number, scoreB: number, rounds = 0) {
  try {
    // Fetch current ratings
    const users = await prisma.user.findMany({ where: { OR: [{ id: { in: teamA } }, { id: { in: teamB } }] } });
    const usersById: Record<string, any> = {};
    for (const u of users) usersById[u.id] = u;

    // Build TrueSkill ratings
  const env = new TrueSkillClass();
    // Prepare teams as arrays of rating objects
    const teamARatings = teamA.map(id => {
      const u = usersById[id];
      const mu = typeof u?.trueSkillMu === 'number' ? u.trueSkillMu : 25.0;
      const sigma = typeof u?.trueSkillSigma === 'number' ? u.trueSkillSigma : 8.333;
  // construct via normalized RatingClass
  return new RatingClass(mu, sigma);
    });
    const teamBRatings = teamB.map(id => {
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

      // Team A updates
      for (let i = 0; i < teamA.length; i++) {
        const id = teamA[i];
        const prev = usersById[id] || {};
        const newRating = newTeamA[i];
        const won = teamARank === 0;
        updates.push(prismaTx.user.update({ where: { id }, data: ({
          totalGames: { increment: 1 },
          totalWins: won ? { increment: 1 } : undefined,
          totalPoints: { increment: Math.round((won ? 3 : 0)) },
          trueSkillMu: newRating.mu,
          trueSkillSigma: newRating.sigma
        } as any) }));
        updates.push(prismaTx.gameSession.create({ data: { userId: id, gameType: 'schieber', result: won ? 'win' : 'loss', points: Math.round((won ? 3 : 0)), duration: rounds * 2 } }));
      }

      // Team B updates
      for (let i = 0; i < teamB.length; i++) {
        const id = teamB[i];
        const prev = usersById[id] || {};
        const newRating = newTeamB[i];
        const won = teamBRank === 0;
        updates.push(prismaTx.user.update({ where: { id }, data: ({
          totalGames: { increment: 1 },
          totalWins: won ? { increment: 1 } : undefined,
          totalPoints: { increment: Math.round((won ? 3 : 0)) },
          trueSkillMu: newRating.mu,
          trueSkillSigma: newRating.sigma
        } as any) }));
        updates.push(prismaTx.gameSession.create({ data: { userId: id, gameType: 'schieber', result: won ? 'win' : 'loss', points: Math.round((won ? 3 : 0)), duration: rounds * 2 } }));
      }

      await Promise.all(updates);
    });

    return true;
  } catch (error) {
    console.error('Error updating match stats:', error);
    throw error;
  }
}

// Backwards-compatible function used by routes expecting single-user update
export async function updateUserStats(userId: string, stats: {
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  totalRounds: number;
}) {
  // For compatibility, we update the single user and leave rating unchanged
  try {
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
        duration: stats.totalRounds * 2
      }
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
}
