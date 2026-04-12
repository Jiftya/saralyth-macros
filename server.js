const http = require('http');
const fs = require('fs');
const path = require('path');
const { generatePosts } = require('./scripts/generate-posts');

const root = path.resolve(__dirname);
const port = process.env.PORT || 3000;

generatePosts();

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
  };
  return map[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 500;
      res.end('Server error');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', getContentType(filePath));
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let target;

  if (urlPath === '/' ) {
    target = path.join(root, 'index.html');
  } else if (urlPath === '/applications' || urlPath === '/applications/') {
    target = path.join(root, 'applications', 'index.html');
  } else {
    target = path.join(root, urlPath);
    if (urlPath.endsWith('/')) {
      target = path.join(target, 'index.html');
    }
  }

  if (!target.startsWith(root)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    serveFile(res, target);
    return;
  }

  if (!path.extname(target)) {
    serveFile(res, path.join(root, 'index.html'));
    return;
  }

  res.statusCode = 404;
  res.end('404 Not Found');
});

server.listen(port, () => {
  console.log(`Seralyth Macro Vault is running on http://localhost:${port}`);
});
