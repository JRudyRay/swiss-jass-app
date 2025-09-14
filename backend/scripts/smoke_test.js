(async ()=>{
  const base = 'http://localhost:3000';
  const fetch = globalThis.fetch || require('node-fetch');
  try {
    // Register two users
    const u1 = { email: 'smoke1@example.test', username: 'smoke1', password: 'password' };
    const u2 = { email: 'smoke2@example.test', username: 'smoke2', password: 'password' };
    let res = await fetch(base + '/api/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(u1) });
    let j1 = await res.json();
    console.log('reg1', j1.success);
    res = await fetch(base + '/api/auth/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(u2) });
    let j2 = await res.json();
    console.log('reg2', j2.success);

    // login both
    res = await fetch(base + '/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emailOrUsername: 'smoke1', password: 'password' }) });
    const l1 = await res.json();
    res = await fetch(base + '/api/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ emailOrUsername: 'smoke2', password: 'password' }) });
    const l2 = await res.json();
    console.log('login1', l1.success, 'login2', l2.success);

    // get profile to obtain IDs
    res = await fetch(base + '/api/auth/profile', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ token: l1.token }) });
    // but /api/auth/profile expects Authorization; use verify instead
    res = await fetch(base + '/api/auth/verify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ token: l1.token }) });
    const p1 = await res.json();
    res = await fetch(base + '/api/auth/verify', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ token: l2.token }) });
    const p2 = await res.json();
    console.log('verify1', p1.success, 'verify2', p2.success);
    const id1 = p1.user.id; const id2 = p2.user.id;

    // post match report
    res = await fetch(base + '/api/games/report', { method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${l1.token}` }, body: JSON.stringify({ teamA: [id1], teamB: [id2], scoreA: 120, scoreB: 60, rounds: 10 }) });
    const r = await res.json();
    console.log('report', r);

    // fetch users
    res = await fetch(base + '/api/admin/users');
    const all = await res.json();
    console.log('users', all.users.filter(u=>u.username && u.username.startsWith('smoke')));
  } catch (e) { console.error(e); }
})();
