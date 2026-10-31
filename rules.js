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
export { ROUTES } from './map-layout.js';
