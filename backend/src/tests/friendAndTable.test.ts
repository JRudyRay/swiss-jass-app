import request from 'supertest';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../routes/auth';
import tableRoutes from '../routes/tables';
import friendRoutes from '../routes/friends';

// Minimal server bootstrap for integration tests
const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/friends', friendRoutes);

function registerAndLogin(username: string, email: string) {
  return request(app).post('/api/auth/register').send({ username, email, password: 'pass1234' });
}

(async () => {
  try {
    // Clean DB users & related
    await prisma.friendRequest.deleteMany();
    await prisma.friendship.deleteMany();
    await prisma.gameTablePlayer.deleteMany();
    await prisma.gameTable.deleteMany();
    await prisma.user.deleteMany();

    const r1 = await registerAndLogin('alice', 'alice@example.com');
    const token1 = r1.body.token;
    const r2 = await registerAndLogin('bob', 'bob@example.com');
    const token2 = r2.body.token;

    // Alice creates a table
    const tableRes = await request(app)
      .post('/api/tables')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'Test Table', maxPlayers: 4 });
    if (!tableRes.body.success) throw new Error('Table create failed');

    // Bob lists tables and joins
    const listRes = await request(app)
      .get('/api/tables')
      .set('Authorization', `Bearer ${token2}`);
    const tableId = listRes.body.tables[0].id;
    await request(app)
      .post(`/api/tables/${tableId}/join`)
      .set('Authorization', `Bearer ${token2}`);

    // Alice sends friend request to Bob
    const frReq = await request(app)
      .post('/api/friends/request')
      .set('Authorization', `Bearer ${token1}`)
      .send({ username: 'bob' });
    if (!frReq.body.success) throw new Error('Friend request failed');

    // Bob lists requests
    const bobRequests = await request(app)
      .get('/api/friends/requests')
      .set('Authorization', `Bearer ${token2}`);
    const reqId = bobRequests.body.requests[0].id;

    // Bob accepts
    await request(app)
      .post(`/api/friends/requests/${reqId}/respond`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ accept: true });

    // Alice lists friends
    const aliceFriends = await request(app)
      .get('/api/friends')
      .set('Authorization', `Bearer ${token1}`);

    console.log('SMOKE_RESULT', {
      tableCreated: tableRes.body.table?.id,
      bobJoined: true,
      friendshipCount: aliceFriends.body.friends.length
    });
  } catch (e) {
    console.error('SMOKE_TEST_FAILED', e);
  } finally {
    await prisma.$disconnect();
  }
})();
