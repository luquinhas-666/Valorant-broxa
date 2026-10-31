import assert from 'node:assert/strict';
import { loadHeadlessGame } from '../server/simulation.mjs';
import { MAP, SPAWNS, SITES, ROUTES, AREAS } from '../map-layout.js';
const { arenaWorld: w } = await loadHeadlessGame();
let count = 0;
function check(name, fn) {
  fn();
  count++;
  console.log('PASS', name);
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function routeLength(start, end) {
  const route = w.path(start, end);
  assert.ok(route.length > 0, JSON.stringify({ start, end }));
  let total = 0,
    p = start;
  for (const q of route) {
    total += distance(p, q);
    p = q;
  }
  return total;
}
check('Arena tem 96 por 96 unidades, mais do dobro da área anterior', () =>
  assert.ok(MAP.halfWidth * MAP.halfDepth * 4 > 64 * 68 * 2),
);
check('Cinco posições de cada base estão livres e conectadas', () => {
  for (const spawn of Object.values(SPAWNS))
    for (const x of [0, -4, 4, -7, 7]) {
      assert.equal(w.blocked(x, spawn.z), false);
      assert.ok(routeLength({ x, z: spawn.z }, SITES[0]) > 0);
    }
});
check('Todos os planos usam destinos livres, com segmentos caminháveis', () => {
  for (const routes of Object.values(ROUTES))
    for (const r of routes) {
      let previous = SPAWNS.attack;
      for (const p of r.points) {
        assert.equal(w.blocked(p.x, p.z, 0.38), false, `${r.name} ${JSON.stringify(p)}`);
        routeLength(previous, p);
        previous = p;
      }
    }
});
check('As duas bases alcançam os dois pontos sem teleportes', () => {
  for (const start of Object.values(SPAWNS))
    for (const site of SITES) {
      const points = w.path(start, site),
        pos = { ...start };
      for (const q of points) {
        w.move(pos, q.x - pos.x, q.z - pos.z, 0.38);
        assert.ok(distance(pos, q) < 0.2, JSON.stringify({ pos, q }));
      }
      assert.ok(distance(pos, site) < 2);
    }
});
check('Barreiras bloqueiam todas as três saídas durante a compra', () => {
  w.setBuyPhase(true);
  for (const x of [-40, -24, 0, 28, 40]) {
    const p = { x, z: 31 };
    w.move(p, 0, -8, 0.38);
    assert.ok(p.z > MAP.attackBarrier + 0.3);
  }
  for (const x of [-30, 0, 30]) {
    const p = { x, z: -34 };
    w.move(p, 0, 10, 0.38);
    assert.ok(p.z < MAP.defenseBarrier - 0.3);
  }
  w.setBuyPhase(false);
});
check('Nenhum spawn tem linha de tiro direta ao outro ou aos plants', () => {
  const v = (p) => ({ ...p, y: 1.6 });
  assert.equal(w.clearLine(v(SPAWNS.attack), v(SPAWNS.defense)), false);
  for (const spawn of Object.values(SPAWNS))
    for (const site of SITES) assert.equal(w.clearLine(v(spawn), v(site)), false);
});
check('A torre corta a linha direta entre praça e base defensora', () =>
  assert.equal(w.clearLine({ x: 0, y: 1.6, z: 8 }, { x: 0, y: 1.6, z: -30 }), false),
);
check('A e B possuem entrada principal, curto do meio e acesso de retomada', () => {
  for (const [site, entries] of [
    [
      SITES[0],
      [
        { x: -32, z: -4 },
        { x: -14, z: -12 },
        { x: -30, z: -30 },
      ],
    ],
    [
      SITES[1],
      [
        { x: 32, z: -4 },
        { x: 14, z: -10 },
        { x: 30, z: -30 },
      ],
    ],
  ])
    for (const e of entries) assert.ok(routeLength(e, site) > 0);
});
check('Rotação da defesa é menor que o flanco completo pelo ataque', () => {
  const defense = routeLength({ x: -30, z: -32 }, { x: 30, z: -32 });
  const flank = routeLength(SITES[0], { x: 0, z: 31 }) + routeLength({ x: 0, z: 31 }, SITES[1]);
  assert.ok(defense < flank);
});
check('Tempos de entrada dos lados A e B ficam próximos sem exigir simetria', () => {
  const a = routeLength(SPAWNS.attack, SITES[0]),
    b = routeLength(SPAWNS.attack, SITES[1]);
  assert.ok(Math.abs(a - b) / Math.max(a, b) < 0.22, `${a} / ${b}`);
  console.log(
    `  Percurso inicial: A ${(a / 5.3).toFixed(1)}s / B ${(b / 5.3).toFixed(1)}s (correndo, caminho mínimo)`,
  );
});
check('Túnel A e armazém têm tetos físicos sem bloquear o chão', () => {
  for (const p of [
    { x: -32, z: 14 },
    { x: 28, z: 16 },
  ]) {
    assert.equal(w.blocked(p.x, p.z, 0.38), false);
    assert.ok(w.ceilingHeight(p.x, p.z, 1.7) < 4.1);
  }
});
check('Cada plant padrão permite ficar em pé e os dois pontos estão separados', () => {
  for (const site of SITES) assert.equal(w.blocked(site.x, site.z, 0.38), false);
  assert.ok(distance(...SITES) > 55);
});
console.log(`${count} verificações do mapa passaram.`);
