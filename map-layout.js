// Original arena. All coordinates are shared by graphics, navigation and multiplayer.
export const MAP = { halfWidth: 48, halfDepth: 48, attackBarrier: 28, defenseBarrier: -28 };
export const SPAWNS = { attack: { x: 0, z: 40 }, defense: { x: 0, z: -42 } };
export const SITES = [
  { name: 'A', x: -30, z: -16, r: 6 },
  { name: 'B', x: 30, z: -16, r: 6 },
];
// Rectangles describe connected playable spaces. Everything outside them is architecture.
// Widths are even so the 2-unit navigation grid fits through every doorway.
export const AREAS = [
  { name: 'BASE ATACANTE', x: 0, z: 40, w: 36, d: 12, color: '#beb49d' },
  { name: 'DISTRIBUIDOR SUL', x: 0, z: 31, w: 88, d: 10, color: '#c9bca1' },
  { name: 'JARDIM LONGO', x: -40, z: 12, w: 8, d: 36, color: '#b6b99d' },
  { name: 'GALERIAS', x: -24, z: 17, w: 8, d: 26, color: '#d5c3aa' },
  { name: 'PASSAGEM DAS FLORES', x: -32, z: 14, w: 24, d: 8, color: '#bac1aa' },
  { name: 'ÁTRIO A', x: -28, z: 3, w: 16, d: 10, color: '#d5c3aa' },
  { name: 'ENTRADA A', x: -32, z: -4, w: 8, d: 16, color: '#d1c7ab' },
  { name: 'CURVA DO JARDIM', x: -36, z: -5, w: 16, d: 10, color: '#bac1aa' },
  { name: 'PONTO A', x: -30, z: -17, w: 24, d: 22, color: '#bfc4ad' },
  { name: 'ARMAZÉM', x: 28, z: 15, w: 12, d: 22, color: '#b6bec1' },
  { name: 'CANAL LONGO', x: 40, z: 12, w: 8, d: 36, color: '#a8bbb9' },
  { name: 'LIGAÇÃO DO CANAL', x: 34, z: 25, w: 20, d: 10, color: '#b6bec1' },
  { name: 'PÁTIO B', x: 32, z: 1, w: 16, d: 14, color: '#b8c1bd' },
  { name: 'ENTRADA B', x: 32, z: -6, w: 8, d: 12, color: '#a8bbb9' },
  { name: 'CURVA DO CANAL', x: 38, z: -5, w: 12, d: 10, color: '#a8bbb9' },
  { name: 'PONTO B', x: 30, z: -17, w: 24, d: 22, color: '#b6bec1' },
  { name: 'PORTÃO DO MEIO', x: 0, z: 21, w: 12, d: 18, color: '#c7b493' },
  { name: 'PRAÇA CENTRAL', x: 0, z: 4, w: 24, d: 20, color: '#d4bca0' },
  { name: 'LIGAÇÃO A', x: -10, z: 2, w: 12, d: 8, color: '#c5b8a4' },
  { name: 'COTOVELO A', x: -14, z: -8, w: 8, d: 20, color: '#c5b8a4' },
  { name: 'CURTO A', x: -20, z: -12, w: 12, d: 8, color: '#c5b8a4' },
  { name: 'LIGAÇÃO B', x: 10, z: 0, w: 12, d: 8, color: '#b6c1b7' },
  { name: 'COTOVELO B', x: 14, z: -8, w: 8, d: 20, color: '#b6c1b7' },
  { name: 'CURTO B', x: 20, z: -10, w: 12, d: 8, color: '#b6c1b7' },
  { name: 'TORRE OESTE', x: -9, z: -15, w: 6, d: 18, color: '#c5b8a4' },
  { name: 'TORRE LESTE', x: 9, z: -15, w: 6, d: 18, color: '#b6c1b7' },
  { name: 'PRAÇA DA DEFESA', x: 0, z: -24, w: 24, d: 8, color: '#bac5bb' },
  { name: 'ROTAÇÃO NORTE', x: 0, z: -34, w: 80, d: 8, color: '#bac5bb' },
  { name: 'RETOMADA A', x: -30, z: -28, w: 8, d: 16, color: '#bac5bb' },
  { name: 'RETOMADA B', x: 30, z: -28, w: 8, d: 16, color: '#bac5bb' },
  { name: 'PORTÃO NORTE', x: 0, z: -31, w: 12, d: 18, color: '#bac5bb' },
  { name: 'BASE DEFENSORA', x: 0, z: -42, w: 28, d: 8, color: '#aebeb6' },
];
AREAS.push(
  { name: 'PASSAGEM DA PRAÇA A', x: -16, z: 12, w: 16, d: 8, color: '#c5b8a4' },
  { name: 'PASSAGEM DA PRAÇA B', x: 18, z: 12, w: 16, d: 8, color: '#b6c1b7' },
);
export const CALLOUTS = [
  { text: 'BASE ATACANTE', x: 0, z: 41 },
  { text: 'BASE DEFENSORA', x: 0, z: -43 },
  { text: 'ROTAÇÃO', x: 0, z: -34 },
  { text: 'JARDIM', x: -40, z: 21 },
  { text: 'GALERIAS', x: -24, z: 21 },
  { text: 'TÚNEL', x: -32, z: 14 },
  { text: 'PRAÇA', x: 0, z: 5 },
  { text: 'LIGAÇÃO A', x: -15, z: 12 },
  { text: 'LIGAÇÃO B', x: 16, z: 12 },
  { text: 'TORRE', x: 0, z: -14 },
  { text: 'CURTO A', x: -16, z: -11 },
  { text: 'CURTO B', x: 17, z: -8 },
  { text: 'ARMAZÉM', x: 28, z: 17 },
  { text: 'CANAL', x: 40, z: 17 },
];
const p = (x, z) => ({ x, z });
export const ROUTES = {
  A: [
    {
      name: 'GALERIAS / PRINCIPAL',
      points: [p(-24, 30), p(-24, 20), p(-24, 4), p(-32, 4), p(-32, -8), p(-30, -16)],
    },
    {
      name: 'JARDIM LONGO',
      points: [p(-40, 30), p(-40, 20), p(-42, 4), p(-40, -4), p(-32, -4), p(-32, -10), p(-30, -16)],
    },
    {
      name: 'MEIO / CURTO A',
      points: [p(0, 28), p(-4, 18), p(-4, 4), p(-14, 2), p(-14, -12), p(-22, -12), p(-30, -16)],
    },
    {
      name: 'TÚNEL DAS FLORES',
      points: [
        p(-40, 30),
        p(-40, 14),
        p(-30, 14),
        p(-24, 14),
        p(-24, 4),
        p(-32, 4),
        p(-32, -8),
        p(-30, -16),
      ],
    },
  ],
  B: [
    {
      name: 'ARMAZÉM / PRINCIPAL',
      points: [p(28, 28), p(28, 18), p(28, 6), p(32, 2), p(32, -8), p(30, -16)],
    },
    {
      name: 'CANAL LONGO',
      points: [p(40, 30), p(40, 22), p(38, 6), p(40, -4), p(32, -4), p(32, -10), p(30, -16)],
    },
    {
      name: 'MEIO / CURTO B',
      points: [p(0, 28), p(4, 18), p(4, 4), p(14, 0), p(14, -10), p(22, -10), p(30, -16)],
    },
    {
      name: 'PONTE DO CANAL',
      points: [
        p(40, 30),
        p(40, 24),
        p(28, 24),
        p(28, 14),
        p(28, 6),
        p(32, 2),
        p(32, -8),
        p(30, -16),
      ],
    },
  ],
};
export function playable(x, z) {
  return AREAS.some((a) => Math.abs(x - a.x) < a.w / 2 && Math.abs(z - a.z) < a.d / 2);
}

ROUTES.A.push({
  name: 'DIVISÃO PRAÇA / GALERIAS',
  points: [
    p(0, 28),
    p(-4, 18),
    p(-8, 12),
    p(-14, 14),
    p(-24, 14),
    p(-24, 4),
    p(-32, 4),
    p(-32, -8),
    p(-30, -16),
  ],
});
ROUTES.B.push({
  name: 'DIVISÃO PRAÇA / ARMAZÉM',
  points: [
    p(0, 28),
    p(4, 18),
    p(10, 12),
    p(18, 12),
    p(28, 12),
    p(28, 6),
    p(32, 2),
    p(32, -8),
    p(30, -16),
  ],
});
export function surfaceAt(position) {
  const p = fromMapPoint(position);
  if (p.x > 22 && p.x < 34 && p.z > 5 && p.z < 24) return 'metal';
  if (p.x < -35 && p.z > -6 && p.z < 28) return 'grass';
  return 'stone';
}

// The authored layout uses 96-unit coordinates; one shared projection expands it
// to 120 units, including its physical cover, barriers, floors and site markers.
export const MAP_SCALE = 1.25;
export const toMapPoint = (p) => ({ ...p, x: p.x * MAP_SCALE, z: p.z * MAP_SCALE });
export const fromMapPoint = (p) => ({ ...p, x: p.x / MAP_SCALE, z: p.z / MAP_SCALE });
export const LAYOUT = {
  MAP: { ...MAP },
  AREAS: AREAS.map((a) => ({ ...a })),
  SITES: SITES.map((s) => ({ ...s })),
  CALLOUTS: CALLOUTS.map((c) => ({ ...c })),
};
for (const key of Object.keys(MAP)) MAP[key] *= MAP_SCALE;
for (const p of [...Object.values(SPAWNS), ...SITES, ...AREAS, ...CALLOUTS]) {
  p.x *= MAP_SCALE;
  p.z *= MAP_SCALE;
  for (const key of ['w', 'd', 'r']) if (key in p) p[key] *= MAP_SCALE;
}
for (const routes of Object.values(ROUTES))
  for (const route of routes) route.points = route.points.map(toMapPoint);
