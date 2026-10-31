import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { WebSocketServer } from './vendor/ws/wrapper.mjs';
import { createSimulation } from './simulation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const agents = ['vex', 'sol', 'echo', 'aegis', 'nyx', 'kite', 'meda', 'rook'];
const rooms = new Map(),
  clients = new Set();
const allowedKeys = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'Space',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
]);
const allowedCommands = new Set([
  'buy',
  'armor',
  'slot',
  'skill',
  'reload',
  'drop',
  'ready',
  'plan',
]);
const nickname = (s) =>
  String(s || 'Jogador')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .trim()
    .slice(0, 18) || 'Jogador';
const send = (ws, data) => {
  if (ws.readyState === 1 && ws.bufferedAmount < 256 * 1024) ws.send(JSON.stringify(data));
};
const error = (ws, message) => send(ws, { type: 'error', message });
function publicLobby(room) {
  return {
    type: 'lobby',
    code: room.code,
    mode: room.mode,
    bots: room.bots,
    host: room.host,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      agent: p.agent,
      team: p.team,
      connected: !!p.ws,
    })),
  };
}
function broadcast(room, data) {
  for (const p of room.players.values()) if (p.ws) send(p.ws, data);
}
function lobby(room) {
  broadcast(room, publicLobby(room));
}
function assignAgent(room, team, wanted, except = null) {
  const used = new Set(
    [...room.players.values()]
      .filter((p) => p.team === team && p.id !== except)
      .map((p) => p.agent),
  );
  return agents.includes(wanted) && !used.has(wanted) ? wanted : agents.find((a) => !used.has(a));
}
function enter(ws, room, data) {
  if (ws.member) return error(ws, 'Você já está em uma sala.');
  if (room.loading || room.sim) return error(ws, 'Esta partida já começou. Aguarde uma nova sala.');
  const size = room.mode === 'competitive' ? 5 : 3;
  if (room.players.size >= size * 2) return error(ws, 'A sala está cheia.');
  const count = (t) => [...room.players.values()].filter((p) => p.team === t).length;
  const team = count(0) <= count(1) ? 0 : 1;
  const p = {
    id: randomBytes(8).toString('hex'),
    token: randomBytes(24).toString('hex'),
    name: nickname(data.name),
    agent: assignAgent(room, team, data.agent),
    team,
    ws,
    room,
  };
  room.players.set(p.id, p);
  ws.member = p;
  room.host ||= p.id;
  send(ws, { type: 'welcome', id: p.id, token: p.token, code: room.code });
  lobby(room);
}
function detach(ws, permanent = false) {
  const p = ws.member;
  if (!p) return;
  ws.member = null;
  if (p.ws !== ws) return;
  p.ws = null;
  p.disconnected = Date.now();
  p.room.sim?.disconnect(p.id);
  if (!p.room.sim || permanent) {
    p.room.players.delete(p.id);
  }
  if (p.room.host === p.id)
    p.room.host = [...p.room.players.values()].find((a) => a.ws)?.id || null;
  if (!p.room.sim) lobby(p.room);
  if (![...p.room.players.values()].some((a) => a.ws)) p.room.emptySince = Date.now();
}
async function start(ws, room) {
  if (room.host !== ws.member?.id) return error(ws, 'Somente o dono da sala pode iniciar.');
  if (room.loading || room.sim) return;
  const roster = [...room.players.values()].filter((p) => p.ws);
  if (![0, 1].every((team) => roster.some((p) => p.team === team)))
    return error(ws, 'É necessário um amigo em cada equipe para começar.');
  room.loading = true;
  broadcast(room, { type: 'error', message: 'Preparando o mapa e as equipes…' });
  try {
    room.sim = await createSimulation(
      roster.map(({ id, name, agent, team }) => ({ id, name, agent, team })),
      { mode: room.mode, bots: room.bots },
    );
    room.last = performance.now();
  } catch (e) {
    console.error('Falha ao iniciar sala:', e);
    broadcast(room, { type: 'error', message: 'Falha ao preparar a partida. Tente novamente.' });
  } finally {
    room.loading = false;
  }
}
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true,"game":"RUPTURE","version":5}');
    return;
  }
  try {
    const decoded = decodeURIComponent(pathname),
      filename = path.resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
    if (
      !filename.startsWith(root) ||
      decoded.startsWith('/server/') ||
      !['.html', '.js', '.css', '.svg'].includes(path.extname(filename))
    )
      throw Error('Forbidden');
    const body = await readFile(filename);
    res.writeHead(200, {
      'Content-Type': mime[path.extname(filename)],
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });
server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/ws' || clients.size >= 24) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.alive = true;
  ws.rate = 0;
  ws.rateAt = Date.now();
  ws.on('pong', () => (ws.alive = true));
  ws.on('error', () => {});
  ws.on('close', () => {
    clients.delete(ws);
    detach(ws);
  });
  ws.on('message', (raw) => {
    if (Date.now() - ws.rateAt > 1000) {
      ws.rate = 0;
      ws.rateAt = Date.now();
    }
    if (++ws.rate > 100) {
      ws.close(1008, 'Muitas mensagens');
      return;
    }
    let d;
    try {
      d = JSON.parse(raw.toString());
      if (!d || typeof d !== 'object') return;
    } catch {
      return;
    }
    if (d.type === 'ping') {
      send(ws, { type: 'pong', time: d.time });
      return;
    }
    if (d.type === 'resume') {
      if (ws.member) return;
      const room = rooms.get(String(d.code)),
        p = room?.players.get(String(d.id));
      if (
        !p ||
        p.token !== d.token ||
        !room.sim ||
        Date.now() - (p.disconnected || Date.now()) > 60000
      ) {
        send(ws, {
          type: 'closed',
          message: 'Não foi possível recuperar a sala. Crie uma nova partida.',
        });
        return;
      }
      if (p.ws) {
        p.ws.member = null;
        p.ws.close();
      }
      p.ws = ws;
      ws.member = p;
      room.emptySince = null;
      room.host ||= p.id;
      room.sim.input(p.id, { keys: [], yaw: 0, pitch: 0 });
      send(ws, { type: 'welcome', id: p.id, token: p.token, code: room.code });
      return;
    }
    if (d.type === 'create') {
      if (ws.member) return error(ws, 'Saia da sala atual primeiro.');
      if (rooms.size >= 3)
        return error(ws, 'Servidor ocupado. Tente novamente após uma partida terminar.');
      let code;
      do {
        code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
      } while (rooms.has(code));
      const room = {
        code,
        mode: d.mode === 'competitive' ? 'competitive' : 'quick',
        bots: d.bots === true,
        players: new Map(),
        host: null,
        sim: null,
      };
      rooms.set(code, room);
      enter(ws, room, d);
      return;
    }
    if (d.type === 'join') {
      const room = rooms.get(String(d.code).toUpperCase());
      if (!room) return error(ws, 'Sala não encontrada. Confira o código.');
      enter(ws, room, d);
      return;
    }
    const p = ws.member;
    if (!p) return;
    const room = p.room;
    if (d.type === 'leave') {
      detach(ws, true);
      return;
    }
    if (d.type === 'choose' && !room.sim && !room.loading) {
      if (![0, 1].includes(d.team) || !agents.includes(d.agent)) return;
      const size = room.mode === 'competitive' ? 5 : 3;
      if (
        [...room.players.values()].filter((a) => a.id !== p.id && a.team === d.team).length >= size
      )
        return error(ws, 'Esta equipe está cheia.');
      const agent = assignAgent(room, d.team, d.agent, p.id);
      if (agent !== d.agent) return error(ws, 'Este agente já está na equipe. Escolha outro.');
      p.team = d.team;
      p.agent = agent;
      lobby(room);
      return;
    }
    if (d.type === 'start') {
      void start(ws, room);
      return;
    }
    if (d.type === 'rematch' && room.host === p.id && room.sim?.snapshot(p.id).state === 'match') {
      room.sim = null;
      for (const a of room.players.values()) if (!a.ws) room.players.delete(a.id);
      lobby(room);
      return;
    }
    if (!room.sim) return;
    if (d.type === 'input') {
      if (!Number.isFinite(d.yaw) || !Number.isFinite(d.pitch)) return;
      room.sim.input(p.id, {
        keys: Array.isArray(d.keys) ? d.keys.filter((k) => allowedKeys.has(k)).slice(0, 10) : [],
        yaw: d.yaw % (Math.PI * 2),
        pitch: Math.max(-1.45, Math.min(1.45, d.pitch)),
        fire: d.fire === true,
        aim: d.aim === true,
      });
    }
    if (
      d.type === 'command' &&
      allowedCommands.has(d.action) &&
      ['string', 'number', 'undefined'].includes(typeof d.value)
    )
      room.sim.command(p.id, d.action, d.value);
  });
});
let ticks = 0;
const timer = setInterval(() => {
  const now = performance.now();
  for (const [code, room] of rooms) {
    if (room.emptySince && Date.now() - room.emptySince > 60000) {
      rooms.delete(code);
      continue;
    }
    if (!room.sim) continue;
    try {
      const dt = Math.min((now - room.last) / 1000, 0.1);
      room.last = now;
      // Bounded substeps preserve collisions during occasional server stalls.
      for (let elapsed = 0; elapsed < dt; elapsed += 1 / 60)
        room.sim.tick(Math.min(1 / 60, dt - elapsed));
      if (ticks % 2 === 0)
        for (const p of room.players.values())
          if (p.ws) send(p.ws, { type: 'snapshot', snapshot: room.sim.snapshot(p.id) });
    } catch (e) {
      console.error('Falha na partida:', e);
      broadcast(room, {
        type: 'closed',
        message: 'A partida foi encerrada por um erro no servidor.',
      });
      rooms.delete(code);
    }
  }
  ticks++;
}, 1000 / 40);
const heartbeat = setInterval(() => {
  for (const ws of clients) {
    if (!ws.alive) {
      ws.terminate();
      continue;
    }
    ws.alive = false;
    ws.ping();
  }
}, 15000);
const port = Number(process.env.PORT || 8787);
server.listen(port, '0.0.0.0', () =>
  console.log(`RUPTURE multiplayer em http://localhost:${port} · /health`),
);
function shutdown() {
  clearInterval(timer);
  clearInterval(heartbeat);
  for (const ws of clients) {
    send(ws, {
      type: 'closed',
      message: 'O servidor está reiniciando. Crie outra sala em instantes.',
    });
    ws.close(1001);
  }
  server.close();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
