const mod = require('ts-trueskill');
console.log('keys:', Object.keys(mod));
console.log('has default?', !!mod.default);
console.log('TrueSkill prop type:', typeof mod.TrueSkill);
console.log('Rating prop type:', typeof mod.Rating);
console.log('module:', mod);
try {
  const TS = mod.TrueSkill || (mod.default && mod.default.TrueSkill) || mod;
  console.log('constructed check:', typeof TS === 'function');
} catch(e) { console.error('construct failed', e); }
