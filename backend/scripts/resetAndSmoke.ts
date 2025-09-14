import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function run(cmd: string) {
  console.log('\n> ' + cmd);
  execSync(cmd, { stdio: 'inherit' });
}

const dbPath = path.join(__dirname, '..', 'prisma', 'swiss_jass.db');
const prismaGenDir = path.join(__dirname, '..', 'node_modules', '.prisma');

(async () => {
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('Deleted DB:', dbPath);
    }
    if (fs.existsSync(prismaGenDir)) {
      fs.rmSync(prismaGenDir, { recursive: true, force: true });
      console.log('Removed generated prisma client cache');
    }
    run('npx prisma db push');
    run('npx prisma generate');
    run('npx ts-node scripts/seedTestUsers.ts');
    run('npm run smoke');
    console.log('\nRESET + SMOKE SUCCESS');
  } catch (e) {
    console.error('RESET + SMOKE FAILED', e);
    process.exit(1);
  }
})();
