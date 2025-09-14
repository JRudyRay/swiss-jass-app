import request from 'supertest';
import { PrismaClient } from '@prisma/client';

// Lightweight app factory similar to main server but without sockets
// testApp should export an Express app instance sharing routes; if not present we'll inline minimal setup.

async function ensureApp() {
  // Minimal app replicating subset of routes
  const express = (await import('express')).default;
  const cors = (await import('cors')).default;
  const authRoutes = (await import('../routes/auth')).default;
  const tableRoutes = (await import('../routes/tables')).default;
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/tables', tableRoutes);
  return app;
}

(async () => {
  const prisma = new PrismaClient();
  const app = await ensureApp();
  const email = `int_${Date.now()}@example.com`;
  const username = `intuser_${Date.now()}`;

  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: 'secret123' });
  if (![200,201].includes(registerRes.status)) {
    console.error('Register failed', registerRes.status, registerRes.body);
    process.exit(1);
  }
  const token = registerRes.body.token || registerRes.body?.user?.token || registerRes.body?.token;
  if (!token) {
    console.error('No token returned from register response', registerRes.body);
    process.exit(1);
  }

  const tableRes = await request(app)
    .post('/api/tables')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Integration Table' });
  if (tableRes.status !== 201) {
    console.error('Table creation failed', tableRes.status, tableRes.body);
    process.exit(1);
  }
  if (!tableRes.body.table || !tableRes.body.table.players || tableRes.body.table.players.length !== 1) {
    console.error('Unexpected table payload', tableRes.body);
    process.exit(1);
  }
  console.log('Integration OK: table created with id', tableRes.body.table.id);
  await prisma.$disconnect();
})();
