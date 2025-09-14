import prisma from '../prismaClient';
import { Prisma } from '@prisma/client';

export class TableService {
  static generateCode(length: number = 6) {
    // Simple, deterministic safe code: random base36 chars filtered to alphanumerics & uppercased
    let out = '';
    while (out.length < length) {
      out += Math.random().toString(36).replace(/[^a-z0-9]/gi, '').toUpperCase();
      out = out.replace(/[^A-Z0-9]/g, '').substring(0, length);
    }
    return out;
  }

  static async createTable(userId: string, data: { name?: string; maxPlayers?: number; gameType?: string; team1Name?: string; team2Name?: string; targetPoints?: number; isPrivate?: boolean; password?: string; }) {
    // Ensure the user exists to avoid opaque FK errors
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found (token may be invalid or expired). Please re-login.');
    }
    const code = this.generateCode();
    try {
      const table = await prisma.gameTable.create({
        data: {
          code,
          name: data.name?.trim() || 'New Table',
          maxPlayers: data.maxPlayers && data.maxPlayers > 0 ? data.maxPlayers : 4,
          gameType: data.gameType || 'schieber',
          // @ts-ignore dynamic schema field
          team1Name: data.team1Name?.trim() || 'Team 1',
          // @ts-ignore dynamic schema field
          team2Name: data.team2Name?.trim() || 'Team 2',
          // @ts-ignore dynamic schema field
          targetPoints: data.targetPoints && data.targetPoints > 0 ? data.targetPoints : 1000,
          createdById: userId,
          isPrivate: !!data.isPrivate,
          password: data.password ? data.password : null,
          players: {
            create: [{ userId, isHost: true }]
          }
        },
        include: { players: { include: { user: true } } }
      });
      return table;
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2003') { // FK constraint failed
          throw new Error('Foreign key constraint failed while creating table: user reference invalid. Please re-authenticate.');
        }
        if (err.code === 'P2002') { // unique constraint (rare: code collision)
          // Retry once with a new code
          const retryCode = this.generateCode();
          const table = await prisma.gameTable.create({
            data: {
              code: retryCode,
              name: data.name?.trim() || 'New Table',
              maxPlayers: data.maxPlayers && data.maxPlayers > 0 ? data.maxPlayers : 4,
              gameType: data.gameType || 'schieber',
              // @ts-ignore
              team1Name: data.team1Name?.trim() || 'Team 1',
              // @ts-ignore
              team2Name: data.team2Name?.trim() || 'Team 2',
              // @ts-ignore
              targetPoints: data.targetPoints && data.targetPoints > 0 ? data.targetPoints : 1000,
              createdById: userId,
              isPrivate: !!data.isPrivate,
              password: data.password ? data.password : null,
              players: { create: [{ userId, isHost: true }] }
            },
            include: { players: { include: { user: true } } }
          });
          return table;
        }
      }
      throw err;
    }
  }

  static async listOpenTables() {
  return prisma.gameTable.findMany({
      where: { status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: { players: { include: { user: true } } }
    });
  }

  static async getTable(idOrCode: string) {
  return prisma.gameTable.findFirst({
      where: { OR: [{ id: idOrCode }, { code: idOrCode }] },
      include: { players: { include: { user: true } } }
    });
  }

  static async joinTable(tableId: string, userId: string, password?: string) {
  const table = await prisma.gameTable.findUnique({ where: { id: tableId }, include: { players: true } });
    if (!table) throw new Error('Table not found');
    if (table.status !== 'OPEN') throw new Error('Table not open');
    if (table.isPrivate) {
      if (!password || password !== table.password) throw new Error('Invalid table password');
    }
    if (table.players.length >= table.maxPlayers) throw new Error('Table full');
    const existing = table.players.find(p => p.userId === userId);
    if (existing) return this.getTable(tableId);

  await prisma.gameTablePlayer.create({ data: { tableId, userId } });
    return this.getTable(tableId);
  }

  static async leaveTable(tableId: string, userId: string) {
  const player = await prisma.gameTablePlayer.findFirst({ where: { tableId, userId } });
    if (!player) return;
    await prisma.gameTablePlayer.delete({ where: { id: player.id } });
  const remaining = await prisma.gameTablePlayer.count({ where: { tableId } });
    if (remaining === 0) {
  await prisma.gameTable.update({ where: { id: tableId }, data: { status: 'CANCELLED', endedAt: new Date() } });
    }
  }

  static async startTable(tableId: string, userId: string) {
  const table = await prisma.gameTable.findUnique({ where: { id: tableId }, include: { players: true } });
    if (!table) throw new Error('Table not found');
    const host = table.players.find(p => p.userId === userId && p.isHost);
    if (!host) throw new Error('Only host can start');
    if (table.status !== 'OPEN') throw new Error('Already started');
    // Determine seating: ensure two human players (if exactly 2) are opposite (0 & 2)
    let players = [...table.players];
    const humanPlayers = players.filter(p => !p.userId.startsWith('BOT_'));
    // Assign seatIndex baseline
    if (humanPlayers.length === 2) {
      // Host -> seat 0, other human -> seat 2
      await prisma.gameTablePlayer.update({ where: { id: host.id }, data: { seatIndex: 0 } });
      const other = humanPlayers.find(p => p.id !== host.id)!;
      await prisma.gameTablePlayer.update({ where: { id: other.id }, data: { seatIndex: 2 } });
    }
    // Fill remaining seats with bot placeholders; choose remaining indices 1 and 3 first
    const takenSeats = new Set((await prisma.gameTablePlayer.findMany({ where: { tableId } })).map(p => p.seatIndex).filter(s => s !== null) as number[]);
    const seatPool = [0,1,2,3];
    const availableSeats = seatPool.filter(s => !takenSeats.has(s));
    const existingCount = (await prisma.gameTablePlayer.count({ where: { tableId } }));
    const toFill = Math.max(0, table.maxPlayers - existingCount);
    for (let i=0;i<toFill;i++) {
      const seatIndex = availableSeats[i] ?? null;
      // Bots need actual user rows to satisfy FK constraints. Create/find a shared bot user template.
      const botUsername = `bot_${i+1}`;
      const botEmail = `bot_${i+1}@bots.local`;
      let botUser = await prisma.user.findFirst({ where: { username: botUsername } });
      if (!botUser) {
        botUser = await prisma.user.create({ data: { username: botUsername, email: botEmail, password: '!' } });
      }
      await prisma.gameTablePlayer.create({ data: { tableId, userId: botUser.id, seatIndex, /* @ts-ignore */ isReady: true } as any });
    }
    // Mark host ready
  // @ts-ignore mark host ready
  await prisma.gameTablePlayer.update({ where: { id: host.id }, data: { isReady: true } as any });
    // Mark any bots ready immediately
    const updatedPlayers = await prisma.gameTablePlayer.findMany({ where: { tableId } });
    for (const p of updatedPlayers) {
      // @ts-ignore referencing dynamic field
      if (p.userId.startsWith('BOT_') && !p.isReady) {
        // @ts-ignore
        await prisma.gameTablePlayer.update({ where: { id: p.id }, data: { isReady: true } as any });
      }
    }
    // If all players (including bots) are ready already, advance straight to IN_PROGRESS
    const postPlayers = await prisma.gameTablePlayer.findMany({ where: { tableId } });
    // @ts-ignore
    const everyoneReady = postPlayers.every(p => p.isReady);
    if (everyoneReady) {
      await prisma.gameTable.update({ where: { id: tableId }, data: { status: 'IN_PROGRESS', startedAt: new Date() } as any });
    } else {
      // @ts-ignore STARTING transitional state
      await prisma.gameTable.update({ where: { id: tableId }, data: { status: 'STARTING', startedAt: new Date() } as any });
    }
    return prisma.gameTable.findUnique({ where: { id: tableId }, include: { players: { include: { user: true } } } });
  }

  static async setPlayerReady(tableId: string, userId: string) {
    const player = await prisma.gameTablePlayer.findFirst({ where: { tableId, userId } });
    if (!player) throw new Error('Player not in table');
  // @ts-ignore readiness
  await prisma.gameTablePlayer.update({ where: { id: player.id }, data: { isReady: true } as any });
    const table = await prisma.gameTable.findUnique({ where: { id: tableId }, include: { players: true } });
    if (!table) return null;
    // @ts-ignore dynamic field
    const allReady = table.players.every(p => (p as any).isReady);
    // @ts-ignore STARTING comparison
    if ((table as any).status === 'STARTING' && allReady) {
      // @ts-ignore
      await prisma.gameTable.update({ where: { id: tableId }, data: { status: 'IN_PROGRESS' } as any });
      return prisma.gameTable.findUnique({ where: { id: tableId }, include: { players: { include: { user: true } } } });
    }
    return prisma.gameTable.findUnique({ where: { id: tableId }, include: { players: { include: { user: true } } } });
  }

  static async completeTable(tableId: string) {
  return prisma.gameTable.update({ where: { id: tableId }, data: { status: 'COMPLETED', endedAt: new Date() } });
  }

  static async cancelTable(tableId: string, userId: string) {
  const table = await prisma.gameTable.findUnique({ where: { id: tableId }, include: { players: true } });
    if (!table) throw new Error('Table not found');
    const host = table.players.find(p => p.userId === userId && p.isHost);
    if (!host) throw new Error('Only host can cancel');
  return prisma.gameTable.update({ where: { id: tableId }, data: { status: 'CANCELLED', endedAt: new Date() } });
  }
}
