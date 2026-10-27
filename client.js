// ============================================================================
// client.js -- Zero-dependency Static Web Server for Frontend Client
// Developer: Ritik Kumar (Roll No: 20251651078)
// ============================================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.CLIENT_PORT || 5500;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let cleanUrl = req.url.split('?')[0];
  let reqPath = cleanUrl === '/' ? '/index.html' : cleanUrl;
  const filePath = path.normalize(path.join(PUBLIC_DIR, reqPath));

  // Security check: ensure requests stay within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Server Error: ${err.message}`);
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                   CAMPUS LIBRARY FRONTEND CLIENT                       ║
║  Author     : Ritik Kumar (Roll No: 20251651078)                       ║
╠════════════════════════════════════════════════════════════════════════╣
║  🌐 Web Client URL      : http://localhost:${PORT}/                     ║
║  📡 Connected GraphQL API : http://localhost:4000/                     ║
╚════════════════════════════════════════════════════════════════════════╝
`);
});
