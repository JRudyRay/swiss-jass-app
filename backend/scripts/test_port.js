const http = require('http');
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'test-ok', port: PORT }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  }
});
server.listen(PORT, () => console.log(`test server listening on port ${PORT}`));
server.on('error', (err) => { console.error('test server error', err); process.exit(1); });
