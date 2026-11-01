import { MAP, SPAWNS, SITES } from '../map-layout.js';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createSimulation, loadHeadlessGame } from '../server/simulation.mjs';
import { setTimeout as delay } from 'node:timers/promises';
let checks = 0;
function check(name, fn) {
  fn();
  checks++;
  console.log('PASS', name);
}
const roster = [
  { id: 'a', name: 'Ana', team: 0, agent: 'vex' },
  { id: 'b', name: 'Bia', team: 1, agent: 'sol' },
];
const sim = await createSimulation(roster, { mode: 'quick', bots: false });
const snap = (id) => sim.snapshot(id);
function advance(seconds, inputs = {}) {
  for (let t = 0; t < seconds; t += 1 / 60) {
    for (const [id, input] of Object.entries(inputs))
      sim.input(id, { keys: [], yaw: 0, pitch: 0, ...input });
    sim.tick(Math.min(1 / 60, seconds - t));
  }
}
check('Sala sem bots cria somente os dois humanos', () => assert.equal(snap('a').actors.length, 2));
sim.command('a', 'armor', 25);
sim.tick(0.02);
check('Compra de um amigo não altera o saldo ou escudo do outro', () => {
  assert.equal(snap('a').own.credits, 400);
  assert.equal(snap('b').own.credits, 800);
  assert.equal(snap('b').actors[1].armor, 0);
});
sim.command('b', 'buy', 'invalid-gun');
sim.tick(0.02);
check('Arma inexistente é recusada sem gastar créditos', () =>
  assert.equal(snap('b').own.credits, 800),
);
for (const id of ['frenzy', 'shorty', 'guardian', 'judge', 'odin']) sim.command('b', 'buy', id);
sim.tick(0.02);
check('Armas retiradas do arsenal também são recusadas no servidor', () =>
  assert.equal(snap('b').own.credits, 800),
);
advance(3, { a: { keys: ['KeyW'], fire: true } });
check('Compra bloqueia movimento entre bases e consumo de munição', () => {
  assert.ok(snap('a').actors[0].pos.z > MAP.attackBarrier + 0.3);
  assert.equal(snap('a').own.pistol.ammo, 12);
});
sim.command('a', 'ready');
sim.tick(0.02);
check('Um jogador sozinho não antecipa a compra para todos', () =>
  assert.equal(snap('a').state, 'buy'),
);
sim.command('b', 'ready');
sim.tick(0.02);
check('Todos prontos liberam o round e suas barreiras', () =>
  assert.equal(snap('a').state, 'live'),
);
advance(1, { a: { keys: ['KeyD'] } });
check('Movimento de um humano mantém o adversário independente', () => {
  assert.ok(snap('a').actors[0].pos.x > 4);
  assert.equal(snap('b').actors[1].pos.x, 0);
});
const ammo = snap('a').own.pistol.ammo;
advance(0.1, { a: { keys: ['KeyD'] }, b: { keys: ['KeyD'] } });
check('Dois humanos correndo produzem passos independentes na sala', () => {
  const steps = snap('a').audio.filter((e) => e.type === 'step');
  assert.ok(steps.some((e) => e.position.z > 20));
  assert.ok(steps.some((e) => e.position.z < -20));
});
advance(0.3, { a: { fire: true } });
check('Servidor aplica cadência e munição para disparos humanos', () =>
  assert.equal(snap('a').own.pistol.ammo, ammo - 1),
);
check('Disparo online carrega arma, posição e identificador para os dois clientes', () => {
  const shot = snap('a').audio.find((e) => e.type === 'shot');
  assert.ok(shot);
  assert.equal(shot.variant, 'pulse');
  assert.equal(shot.to, null);
  assert.ok(Number.isFinite(shot.position.x));
  assert.ok(snap('b').audio.some((e) => e.id === shot.id));
});
advance(0.1, { a: { fire: false } });
advance(0.2, { a: { fire: true } });
check('Soltar e apertar novamente permite segundo tiro semiautomático', () =>
  assert.equal(snap('a').own.pistol.ammo, ammo - 2),
);
sim.command('b', 'skill', 1);
sim.tick(0.02);
check('Habilidade do defensor usa cargas próprias e sincroniza efeitos', () => {
  assert.equal(snap('b').own.skills[1], 1);
  assert.ok(snap('a').effects.length > 0);
  assert.equal(snap('a').own.skills[1], 2);
});
sim.command('a', 'buy', 'titan');
sim.tick(0.02);
check('Comprar durante o round é recusado pelo servidor', () =>
  assert.equal(snap('a').own.primary, null),
);
sim.disconnect('a');
const pos = { ...snap('a').actors[0].pos };
advance(1);
check('Eventos de áudio antigos expiram para não repetir após reconexão', () =>
  assert.equal(snap('a').audio.length, 0),
);
check('Desconectar interrompe movimento e disparos', () =>
  assert.equal(JSON.stringify(snap('a').actors[0].pos), JSON.stringify(pos)),
);

// Travel through real collision geometry to plant and defuse, with no test teleports.
const objective = await createSimulation(roster, { mode: 'quick', bots: false });
function move(id, keys, seconds, yaw = 0) {
  for (let t = 0; t < seconds; t += 1 / 60) {
    objective.input(id, { keys, yaw, pitch: 0, fire: false });
    objective.tick(1 / 60);
  }
  objective.input(id, { keys: [], yaw, pitch: 0, fire: false });
}
const navigation = (await loadHeadlessGame()).arenaWorld;
function travel(id, target) {
  const start = objective.snapshot(id).actors.find((a) => a.id === id).pos;
  const route = navigation.path(start, target);
  assert.ok(route.length > 0);
  for (const node of route) {
    let arrived = false;
    for (let i = 0; i < 100; i++) {
      const pos = objective.snapshot(id).actors.find((a) => a.id === id).pos;
      const dx = node.x - pos.x,
        dz = node.z - pos.z,
        d = Math.hypot(dx, dz);
      if (d < 0.09) {
        arrived = true;
        break;
      }
      objective.input(id, { keys: ['KeyW'], yaw: Math.atan2(-dx, -dz), pitch: 0, fire: false });
      objective.tick(Math.min(1 / 60, d / 5.3));
    }
    assert.ok(arrived, JSON.stringify(node));
  }
  objective.input(id, { keys: [], yaw: 0, pitch: 0, fire: false });
}
objective.command('a', 'ready');
objective.command('b', 'ready');
objective.tick(0.02);
travel('a', SITES[0]);
move('a', ['KeyF'], 3.2);
check('Atacante humano percorre a arena e planta em A', () => {
  assert.equal(objective.snapshot('a').spike.planted, true);
  assert.equal(objective.snapshot('b').spike.site, 'A');
});
check('Plantar concede recompensa somente ao portador', () => {
  assert.equal(objective.snapshot('a').own.credits, 1100);
  assert.equal(objective.snapshot('b').own.credits, 800);
});
travel('b', SITES[0]);
move('b', ['KeyF'], 2.7);
check('Defensor humano garante metade do desarme', () =>
  assert.equal(objective.snapshot('b').spike.defuseFloor, 2.5),
);
move('b', [], 0.1);
move('b', ['KeyF'], 2.6);
check('Desarme sincroniza vitória e recompensa da defesa', () => {
  assert.equal(objective.snapshot('a').score[1], 1);
  assert.equal(objective.snapshot('a').spike.outcome, 'SPIKE DESARMADA');
  assert.equal(objective.snapshot('b').own.credits, 4100);
});
move('a', [], 6);
check('Novo round preserva economia individual e recarrega habilidades', () => {
  assert.equal(objective.snapshot('a').state, 'buy');
  assert.equal(objective.snapshot('a').own.credits, 3000);
  assert.equal(objective.snapshot('b').own.credits, 4100);
  assert.equal(objective.snapshot('a').spike.carrier, 'a');
});
objective.command('a', 'buy', 'marshal');
objective.command('a', 'ready');
objective.command('b', 'ready');
objective.tick(0.02);
travel('a', SITES[0]);
travel('b', { x: SITES[0].x, z: SITES[0].z + 4 });
const duelA = objective.snapshot('a').actors[0],
  duelB = objective.snapshot('a').actors[1];
const shotYaw = Math.atan2(-(duelB.pos.x - duelA.pos.x), -(duelB.pos.z - duelA.pos.z));
for (let i = 0; i < 40; i++) {
  objective.input('a', { keys: [], yaw: shotYaw, pitch: -0.1, fire: true, aim: true });
  objective.tick(1 / 60);
}
check('Tiros humanos atingem a hitbox de outro humano e encerram o round', () => {
  assert.equal(objective.snapshot('a').actors[1].alive, false);
  assert.equal(objective.snapshot('a').score[0], 1);
  assert.equal(objective.snapshot('a').actors[0].kills, 1);
});
check('Eliminação é sincronizada no histórico e concede crédito ao autor', () => {
  assert.equal(objective.snapshot('a').own.credits, 3500);
  assert.equal(objective.snapshot('b').feed.length, 1);
});
check('Dano online informa origem, autor e identificador do impacto aos clientes', () => {
  const impact = objective.snapshot('b').actors[1].impact;
  assert.ok(impact.seq > 0);
  assert.ok(impact.amount > 0);
  assert.equal(impact.attacker, 'Ana');
  assert.ok(Math.abs(impact.from.x - duelA.pos.x) < 0.01);
  assert.equal(objective.snapshot('a').actors[1].impact.seq, impact.seq);
});

for (let i = 0; i < 14000 && objective.snapshot('a').state !== 'match'; i++) objective.tick(0.05);
check('Partida online completa troca lados e termina com quatro vitórias', () => {
  assert.equal(objective.snapshot('a').state, 'match');
  assert.equal(Math.max(...objective.snapshot('a').score), 4);
  assert.equal(objective.snapshot('a').attackTeam, 1);
});

const filled = await createSimulation(roster, { mode: 'quick', bots: true });
check('Bots opcionais completam as duas equipes sem substituir amigos', () => {
  assert.equal(filled.snapshot('a').actors.length, 6);
  assert.equal(filled.snapshot('a').actors.filter((a) => a.human).length, 2);
});
filled.command('a', 'ready');
filled.command('b', 'ready');
filled.tick(0.02);
for (let i = 0; i < 1200; i++) filled.tick(1 / 60);
check('Partida mista avança com humanos e bots sem conflito de estado', () =>
  assert.ok(['live', 'end', 'buy'].includes(filled.snapshot('a').state)),
);

// Real sockets exercise room access, validation, joining and reconnection.
const port = 18787;
const child = spawn(process.execPath, ['--experimental-vm-modules', 'server/server.mjs'], {
  cwd: new URL('../', import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', (d) => (output += d));
child.stderr.on('data', (d) => (output += d));
const sockets = [];
async function client() {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  sockets.push(ws);
  const messages = [];
  ws.addEventListener('message', (e) => messages.push(JSON.parse(e.data)));
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  return {
    ws,
    messages,
    send: (d) => ws.send(JSON.stringify(d)),
    wait: async (type, predicate = () => true) => {
      for (let i = 0; i < 160; i++) {
        const index = messages.findIndex((m) => m.type === type && predicate(m));
        if (index >= 0) return messages.splice(index, 1)[0];
        await delay(25);
      }
      throw Error('Timeout ' + type + ' ' + output);
    },
  };
}
try {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) break;
    } catch {}
    await delay(50);
  }
  const a = await client(),
    b = await client(),
    outsider = await client();
  a.send({ type: 'create', name: 'Ana<script>', agent: 'vex', mode: 'quick', bots: false });
  const welcome = await a.wait('welcome');
  check('Servidor cria código privado e credencial individual', () => {
    assert.match(welcome.code, /^[A-F0-9]{6}$/);
    assert.equal(welcome.token.length, 48);
  });
  b.send({ type: 'join', code: welcome.code, name: 'Bia', agent: 'sol' });
  const wb = await b.wait('welcome');
  await b.wait('lobby', (m) => m.players.length === 2);
  outsider.send({ type: 'join', code: 'XXXXXX' });
  await outsider.wait('error');
  check('Código inválido não permite entrar na sala', () => assert.ok(true));
  b.send({ type: 'start' });
  await b.wait('error');
  check('Somente o dono pode iniciar a partida', () => assert.ok(true));
  a.send({ type: 'start' });
  const first = await a.wait('snapshot');
  await b.wait('snapshot');
  check('Dois clientes recebem a mesma partida com estado privado separado', () => {
    assert.equal(first.snapshot.actors.length, 2);
    assert.equal(first.snapshot.state, 'buy');
    assert.equal(first.snapshot.actors[0].name, 'Anascript');
  });
  b.send({ type: 'command', action: 'armor', value: 25 });
  await b.wait('snapshot', (m) => m.snapshot.own.credits === 400);
  check('Compra recebida por WebSocket é aplicada pelo servidor', () => assert.ok(true));
  outsider.send({ type: 'resume', code: welcome.code, id: welcome.id, token: 'wrong' });
  await outsider.wait('closed');
  check('Reconexão exige a credencial do jogador', () => assert.ok(true));
  b.ws.close();
  await delay(100);
  const resumed = await client();
  resumed.send({ ...wb, type: 'resume' });
  await resumed.wait('welcome');
  const rs = await resumed.wait('snapshot');
  check('Reconexão recupera o mesmo jogador e seus créditos', () => {
    assert.equal(rs.snapshot.own.credits, 400);
    assert.ok(rs.snapshot.actors.some((p) => p.id === wb.id));
  });
  a.send({ type: 'command', action: 'ready' });
  resumed.send({ type: 'command', action: 'ready' });
  const started = await resumed.wait('snapshot', (m) => m.snapshot.state === 'live');
  check('Round inicia entre clientes reais quando todos confirmam', () => assert.ok(true));
  check('Sinal de início é sincronizado nos snapshots por WebSocket', () =>
    assert.ok(started.snapshot.audio.some((e) => e.type === 'start' && e.id > 0)),
  );
} finally {
  for (const s of sockets) s.close();
  child.kill();
}
console.log(`\n${checks} verificações multiplayer passaram.`);
