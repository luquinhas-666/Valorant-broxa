import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import { loadEnvironmentAssets, environmentModel, ENVIRONMENT_MODELS } from '../environment.js';
import { SOUND_FILES, preloadSounds, soundKey, audibility, GameAudio } from '../audio.js';
import { ROUTES, surfaceAt, toMapPoint } from '../map-layout.js';
let count = 0;
function check(n, fn) {
  fn();
  count++;
  console.log('PASS', n);
}
const read = async (url) => {
  const b = await fs.readFile(url);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const report = await loadEnvironmentAssets(read);
check('Sete modelos de cenário carregam os GLB reais', () => assert.equal(report.loaded, 7));
check('Modelos de cobertura se ajustam ao volume físico solicitado', () => {
  for (const name of ENVIRONMENT_MODELS) {
    const m = environmentModel(name, { x: 5, z: -3, w: 3, d: 2, h: 2 });
    m.updateMatrixWorld(true);
    const b = new T.Box3().setFromObject(m),
      s = b.getSize(new T.Vector3());
    assert.ok(Math.abs(s.x - 3) < 0.001, name);
    assert.ok(Math.abs(s.y - 2) < 0.001, name);
    assert.ok(Math.abs(s.z - 2) < 0.001, name);
    assert.ok(Math.abs(b.min.y) < 0.001);
  }
});
check('As duas frentes oferecem o quinto plano pela praça', () => {
  for (const side of ['A', 'B']) {
    assert.equal(ROUTES[side].length, 5);
    assert.match(ROUTES[side][4].name, /PRAÇA/);
  }
});
check('Passos distinguem pedra, metal e jardim', () => {
  assert.equal(surfaceAt(toMapPoint({ x: 28, z: 16 })), 'metal');
  assert.equal(surfaceAt(toMapPoint({ x: -40, z: 20 })), 'grass');
  assert.equal(surfaceAt(toMapPoint({ x: 0, z: 5 })), 'stone');
});
await preloadSounds(read);
check('Banco de 25 sons contém WAV mono PCM válidos e sinal audível', () =>
  assert.equal(SOUND_FILES.length, 25),
);
for (const key of SOUND_FILES) {
  const b = await fs.readFile(new URL('../assets/audio/' + key + '.wav', import.meta.url));
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.readUInt16LE(22), 1);
  assert.equal(b.readUInt32LE(24), 24000);
  assert.equal(b.readUInt16LE(34), 16);
  let energy = 0;
  for (let i = 44; i < b.length; i += 2) energy += b.readInt16LE(i) ** 2;
  assert.ok(energy > 100000, key);
}
check('Classes de arma selecionam sons diferentes', () => {
  assert.equal(soundKey('shot', 'marshal'), 'shot-rifle');
  assert.equal(soundKey('shot', 'nova'), 'shot-shotgun');
  assert.equal(soundKey('shot', 'operator'), 'shot-sniper');
  assert.equal(soundKey('shot', 'knife'), 'knife');
});
check('Áudio próximo é mais forte e paredes reduzem a intensidade', () => {
  const l = { x: 0, z: 0 };
  const close = audibility(l, { x: 0, z: -3 });
  assert.ok(close.gain > audibility(l, { x: 0, z: -30 }).gain);
  assert.ok(close.gain > audibility(l, { x: 0, z: -3 }, 0, true).gain);
  assert.equal(audibility(l, { x: 0, z: -60 }).gain, 0);
});
check('Panorama estéreo acompanha a direção de visão', () => {
  const l = { x: 0, z: 0 };
  assert.ok(audibility(l, { x: 5, z: 0 }, 0).pan > 0.9);
  assert.ok(audibility(l, { x: 5, z: 0 }, Math.PI).pan < -0.9);
});
class Node {
  constructor() {
    this.gain = { value: 1 };
    this.pan = { value: 0 };
    this.playbackRate = { value: 1 };
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {
    this.onended?.();
  }
}
const context = {
  state: 'running',
  destination: {},
  createGain: () => new Node(),
  createStereoPanner: () => new Node(),
  createBufferSource: () => new Node(),
  decodeAudioData: async () => ({ duration: 0.2 }),
  resume: async () => {},
};
const a = new GameAudio(context);
await a.ready;
check('Volume zero impede novas vozes', () => {
  a.update({ x: 0, z: 0 }, 0, 0);
  a.play('shot', 1, null, 'marshal');
  assert.equal(a.voices.size, 0);
});
check('Limite de vozes evita acumular fontes durante rajadas', () => {
  a.update({ x: 0, z: 0 }, 0, 1);
  for (let i = 0; i < 60; i++) a.play('shot', 1, null, 'marshal');
  assert.equal(a.voices.size, 32);
  for (const source of [...a.voices]) source.stop();
  assert.equal(a.voices.size, 0);
});
const textures = JSON.parse(
  await fs.readFile(new URL('../assets/textures/manifest.json', import.meta.url)),
);
check('Nove mapas de textura preparados ficam abaixo de 600 KB', () => {
  assert.equal(textures.length, 9);
  assert.ok(textures.reduce((n, t) => n + t.bytes, 0) < 600000);
});
console.log(`${count} verificações de cenário e áudio passaram.`);
