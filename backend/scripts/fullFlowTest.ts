import { spawn } from 'child_process';
import path from 'path';
import fetch from 'node-fetch';

function delay(ms:number){return new Promise(r=>setTimeout(r,ms));}

(async () => {
  const server = spawn('node', ['src/index.ts'], { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
  server.stdout.on('data', d=> process.stdout.write('[SERVER] '+d));
  server.stderr.on('data', d=> process.stderr.write('[SERVER-ERR] '+d));
  let exited = false;
  server.on('exit', c=>{exited=true; console.log('Server exited code',c)});

  // Wait for banner
  let waited=0;
  while(waited<8000){
    await delay(500); waited+=500;
    if (exited) throw new Error('Server exited prematurely');
  }

  const base = 'http://localhost:3000';
  const headersJson = { 'Content-Type':'application/json' };
  async function post(url:string, body:any, token?:string){
    const res = await fetch(base+url,{method:'POST', headers: token?{...headersJson, Authorization:'Bearer '+token}:headersJson, body: JSON.stringify(body||{})});
    const j = await res.json();
    return j;
  }
  async function get(url:string, token?:string){
    const res = await fetch(base+url,{headers: token?{Authorization:'Bearer '+token}:{}});
    return res.json();
  }

  // Login existing seeded users
  const alice = await post('/api/auth/login',{username:'alice',password:'swiss123'});
  if(!alice.token) throw new Error('Alice login failed '+JSON.stringify(alice));
  const bob = await post('/api/auth/login',{username:'bob',password:'swiss123'});
  if(!bob.token) throw new Error('Bob login failed '+JSON.stringify(bob));

  const table = await post('/api/tables',{name:'Flow Test', maxPlayers:4, team1Name:'Alpha', team2Name:'Beta', targetPoints:1200}, alice.token);
  if(!table.success) throw new Error('Create table failed '+JSON.stringify(table));
  const tableId = table.table.id;

  const join = await post(`/api/tables/${tableId}/join`,{}, bob.token);
  if(!join.success) throw new Error('Bob join failed '+JSON.stringify(join));

  const start = await post(`/api/tables/${tableId}/start`,{}, alice.token);
  if(!start.success) throw new Error('Start failed '+JSON.stringify(start));

  const readyBob = await post(`/api/tables/${tableId}/ready`,{}, bob.token);
  if(!readyBob.success) throw new Error('Bob ready failed '+JSON.stringify(readyBob));

  // Fetch final state
  const finalTable = await get(`/api/tables/${tableId}`, alice.token);
  console.log('FLOW_RESULT', {status: finalTable.table?.status, players: finalTable.table?.players?.length});

  server.kill('SIGTERM');
})();
