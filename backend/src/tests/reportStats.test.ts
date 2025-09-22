import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/auth';
import gameRoutes from '../routes/games';
import { PrismaClient } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/games', gameRoutes);

  try {
    // Clean up previous data
    await prisma.gameSession.deleteMany();
    await prisma.user.deleteMany();

    console.log('Registering users...');
    const regA = await request(app).post('/api/auth/register').send({ username: 'ra', email: 'ra@example.com', password: 'swiss' });
    const regB = await request(app).post('/api/auth/register').send({ username: 'rb', email: 'rb@example.com', password: 'swiss' });
    const regC = await request(app).post('/api/auth/register').send({ username: 'rc', email: 'rc@example.com', password: 'swiss' });
    const regD = await request(app).post('/api/auth/register').send({ username: 'rd', email: 'rd@example.com', password: 'swiss' });
    const [userA, userB, userC, userD] = [regA, regB, regC, regD].map(r => r.body.user.id);

    console.log('Reporting match...');
    const res = await request(app)
      .post('/api/games/report')
      .send({ teamA: [userA, userB], teamB: [userC, userD], scoreA: 100, scoreB: 50 });
    if (!res.body.success) throw new Error('Report API failed: ' + JSON.stringify(res.body));

    console.log('Verifying database updates...');
    const uA = await prisma.user.findUnique({ where: { id: userA } });
    const uC = await prisma.user.findUnique({ where: { id: userC } });
    if (uA?.totalGames !== 1 || uA?.totalWins !== 1) throw new Error(`Unexpected stats for A: games=${uA?.totalGames} wins=${uA?.totalWins}`);
    if (uC?.totalGames !== 1 || uC?.totalWins !== 0) throw new Error(`Unexpected stats for C: games=${uC?.totalGames} wins=${uC?.totalWins}`);

    console.log('Stats report test passed');
    process.exit(0);
  } catch (err: any) {
    console.error('Stats report test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
