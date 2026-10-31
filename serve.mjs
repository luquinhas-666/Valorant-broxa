import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};
const port = Number(process.env.PORT || 8765);
http
  .createServer(async (req, res) => {
    try {
      const raw = decodeURIComponent(new URL(req.url, 'http://localhost').pathname),
        filename = path.resolve(root, '.' + (raw === '/' ? '/index.html' : raw));
      if (!filename.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      const body = await readFile(filename);
      res.writeHead(200, {
        'Content-Type': types[path.extname(filename)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  })
  .listen(port, '127.0.0.1', () =>
    console.log(
      `RUPTURE pronto em http://127.0.0.1:${port}\nMantenha esta janela aberta durante o jogo. Ctrl+C encerra.`,
    ),
  )
  .on('error', (e) => {
    console.error(
      e.code === 'EADDRINUSE' ? 'A porta está em uso. Abra http://127.0.0.1:' + port : e.message,
    );
    process.exitCode = 1;
  });
