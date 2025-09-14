import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/auth';
import tableRoutes from '../routes/tables';
import { PrismaClient } from '@prisma/client';
import { multiGameManager } from '../gameEngine/multiGameManager';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/tables', tableRoutes);

async function register(username:string){
  return request(app).post('/api/auth/register').send({username,email:username+'@example.com',password:'swiss123'});
}

(async () => {
  try {
    await prisma.gameTablePlayer.deleteMany();
    await prisma.gameTable.deleteMany();
    await prisma.user.deleteMany();

  const regAlice = await register('alice');
  const regBob = await register('bob');
  console.log('REG_A', regAlice.body); console.log('REG_B', regBob.body);

  // Use registration tokens directly; fallback to login only if missing
  let tokenAlice = regAlice.body.token;
  let tokenBob = regBob.body.token;
  if(!tokenAlice || !tokenBob) {
    const loginAlice = await request(app).post('/api/auth/login').send({ emailOrUsername:'alice', password:'swiss123' });
    const loginBob = await request(app).post('/api/auth/login').send({ emailOrUsername:'bob', password:'swiss123' });
    console.log('LOGIN_A', loginAlice.body); console.log('LOGIN_B', loginBob.body);
    tokenAlice = loginAlice.body.token;
    tokenBob = loginBob.body.token;
  }
  if(!tokenAlice || !tokenBob) throw new Error('Auth failed');

    const createRes = await request(app).post('/api/tables').set('Authorization',`Bearer ${tokenAlice}`).send({ name:'MP Table', maxPlayers:4, team1Name:'A', team2Name:'B', targetPoints:1500 });
    if(!createRes.body.success) throw new Error('Create failed '+JSON.stringify(createRes.body));
    const tableId = createRes.body.table.id;

    const joinRes = await request(app).post(`/api/tables/${tableId}/join`).set('Authorization',`Bearer ${tokenBob}`).send({});
    if(!joinRes.body.success) throw new Error('Join failed '+JSON.stringify(joinRes.body));

    const startRes = await request(app).post(`/api/tables/${tableId}/start`).set('Authorization',`Bearer ${tokenAlice}`).send({});
    if(!startRes.body.success) throw new Error('Start failed '+JSON.stringify(startRes.body));

    const readyBob = await request(app).post(`/api/tables/${tableId}/ready`).set('Authorization',`Bearer ${tokenBob}`).send({});
    if(!readyBob.body.success) throw new Error('Ready failed '+JSON.stringify(readyBob.body));

    const final = await request(app).get(`/api/tables/${tableId}`).set('Authorization',`Bearer ${tokenAlice}`);
    const status = final.body.table.status;
    const state = multiGameManager.getState(tableId);
  if(status !== 'IN_PROGRESS') throw new Error(`Unexpected final status ${status}`);
  if(!state) throw new Error('Game state missing');
  console.log('MULTI_FLOW_RESULT', { status, players: final.body.table.players.length, gameStatePlayers: state?.players.length });
  } catch (e) {
    console.error('MULTI_FLOW_ERROR', e);
  } finally {
    await prisma.$disconnect();
  }
})();
