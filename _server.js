const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json; charset=utf-8' };
http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url.endsWith('/')) url += 'index.html';
  const file = path.join(root, url);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('404 ' + url); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(4177, '0.0.0.0', () => console.log('Jon Vox em http://localhost:4177/ e na rede local pela porta 4177'));
