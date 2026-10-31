export const MODES = {
  competitive: {
    id: 'competitive',
    name: 'COMPETITIVO',
    size: 5,
    win: 13,
    half: 12,
    winBy: 2,
    buy: 30,
    round: 100,
    plant: 4,
    spike: 45,
    defuse: 7,
  },
  quick: {
    id: 'quick',
    name: 'PARTIDA RÁPIDA',
    size: 3,
    win: 4,
    half: 3,
    winBy: 1,
    buy: 30,
    round: 85,
    plant: 3,
    spike: 35,
    defuse: 5,
  },
};
export function attackSide(round, mode) {
  if (mode.id === 'competitive' && round >= 24) return round % 2;
  return round < mode.half ? 0 : 1;
}
export function matchWinner(score, mode) {
  const high = Math.max(...score),
    lead = Math.abs(score[0] - score[1]);
  return high >= mode.win && lead >= mode.winBy ? (score[0] > score[1] ? 0 : 1) : null;
}
export const ROUTES = {
  A: [
    {
      name: 'CASA DAS FLORES',
      points: [
        { x: -16, z: 16 },
        { x: -16, z: 8 },
        { x: -16, z: -2 },
        { x: -19, z: -10 },
      ],
    },
    {
      name: 'JARDIM',
      points: [
        { x: -28, z: 20 },
        { x: -28, z: 6 },
        { x: -28, z: -10 },
        { x: -19, z: -10 },
      ],
    },
    {
      name: 'ARQUIVO',
      points: [
        { x: 0, z: 14 },
        { x: 2, z: -5 },
        { x: 2, z: -13 },
        { x: -8, z: -18 },
        { x: -19, z: -10 },
      ],
    },
  ],
  B: [
    {
      name: 'MERCADO',
      points: [
        { x: 16, z: 16 },
        { x: 16, z: 8 },
        { x: 16, z: -2 },
        { x: 19, z: -10 },
      ],
    },
    {
      name: 'OFICINAS',
      points: [
        { x: 28, z: 20 },
        { x: 28, z: 6 },
        { x: 28, z: -10 },
        { x: 19, z: -10 },
      ],
    },
    {
      name: 'ARQUIVO',
      points: [
        { x: 0, z: 14 },
        { x: 2, z: -5 },
        { x: 2, z: -13 },
        { x: 8, z: -18 },
        { x: 19, z: -10 },
      ],
    },
  ],
};
ROUTES.A.push({
  name: 'TÚNEL DO JARDIM',
  points: [
    { x: -30, z: 20 },
    { x: -30, z: 7 },
    { x: -26, z: 7 },
    { x: -16, z: 7 },
    { x: -16, z: -2 },
    { x: -19, z: -10 },
  ],
});
ROUTES.B.push({
  name: 'TÚNEL DAS OFICINAS',
  points: [
    { x: 30, z: 20 },
    { x: 30, z: 7 },
    { x: 26, z: 7 },
    { x: 16, z: 7 },
    { x: 16, z: -2 },
    { x: 19, z: -10 },
  ],
});
