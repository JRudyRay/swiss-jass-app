const { updateStatsForMatch } = require('../dist/services/gameService');
(async () => {
  try {
    const teamA = ['cmfjvdodh0000fuygvnzcg1ec'];
    const teamB = ['cmfjvdok60001fuyg9sccma1q'];
    console.log('Calling updateStatsForMatch directly...');
    await updateStatsForMatch(teamA, teamB, 100, 50, 5);
    console.log('updateStatsForMatch finished');
  } catch (e) {
    console.error('Direct call error:', e);
    if (e && e.stack) console.error(e.stack);
    process.exit(1);
  }
})();
