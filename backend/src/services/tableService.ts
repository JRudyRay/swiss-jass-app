import prisma from '../prismaClient';
import { nanoid } from 'nanoid';

export class TableService {
  static generateCode(length: number = 6) {
    return nanoid(length).replace(/[^A-Z0-9]/gi, '').substring(0, length).toUpperCase();
  }

  static async createTable(userId: string, data: { name?: string; maxPlayers?: number; gameType?: string; isPrivate?: boolean; password?: string; }) {
    const code = this.generateCode();
  const table = await prisma.gameTable.create({
      data: {
        code,
        name: data.name || 'New Table',
        maxPlayers: data.maxPlayers || 4,
        gameType: data.gameType || 'schieber',
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
  return prisma.gameTable.update({ where: { id: tableId }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
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
