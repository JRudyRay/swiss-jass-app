// Minimal auth-only game service for Railway deployment
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GameService {
  // Simple user stats update - no complex game logic needed
  static async updateUserStats(userId: string, won: boolean, points: number) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          totalGames: { increment: 1 },
          totalWins: won ? { increment: 1 } : undefined,
          totalPoints: { increment: points },
          currentStreak: won ? { increment: 1 } : 0,
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
