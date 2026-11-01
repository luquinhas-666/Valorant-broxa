import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {
  loadModelAssets,
  createImportedSoldier,
  createImportedWeapon,
  weaponAsset,
} from '../models.js';
import { AGENTS, WEAPONS } from '../data.js';
let count = 0;
const check = (name, fn) => {
  fn();
  count++;
  console.log('PASS', name);
};
const report = await loadModelAssets(async (url) => {
  const b = await fs.readFile(url);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
});
check('Os onze arquivos GLB reais são carregados sem serviços externos', () => {
  assert.equal(report.loaded, 11);
  assert.deepEqual(report.failed, []);
});
const all = AGENTS.map((a) => createImportedSoldier(a.color, false, a.id));
check('Oito agentes usam personagens importados e três bases de roupa', () => {
  assert.ok(all.every((a) => a.imported));
  assert.equal(new Set(all.map((a) => a.asset)).size, 3);
});
check('Todos os agentes preservam as seis hitboxes do servidor', () => {
  for (const a of all) {
    assert.equal(a.targets.length, 6);
    const h = a.targets[0],
      body = a.targets[1];
    assert.equal(h.geometry.parameters.radius, 0.205);
    assert.equal(h.position.y, 1.81);
    assert.equal(body.geometry.parameters.radius, 0.25);
    assert.equal(body.position.y, 1.23);
  }
});
check('Esqueletos e materiais de cópias são independentes', () => {
  const b = createImportedSoldier('#ff0000', false, 'vex');
  let meshesA = [],
    meshesB = [];
  all[0].visual.traverse((o) => {
    if (o.isSkinnedMesh) meshesA.push(o);
  });
  b.visual.traverse((o) => {
    if (o.isSkinnedMesh) meshesB.push(o);
  });
  assert.ok(meshesA.length);
  assert.notEqual(meshesA[0].skeleton, meshesB[0].skeleton);
  assert.notEqual(meshesA[0].geometry, meshesB[0].geometry);
  assert.notEqual(meshesA[0].material, meshesB[0].material);
});
check('Corrida anima os ossos, sem depender da translação da entidade', () => {
  const a = all[0];
  a.group.updateMatrixWorld(true);
  const before = [];
  a.visual.traverse((o) => {
    if (o.isBone) before.push(o.matrixWorld.clone());
  });
  for (let i = 0; i < 20; i++) a.animate(true, i * 0.05, true, 0.05);
  a.group.updateMatrixWorld(true);
  let changed = 0,
    index = 0;
  a.visual.traverse((o) => {
    if (o.isBone) {
      if (!o.matrixWorld.equals(before[index])) changed++;
      index++;
    }
  });
  assert.ok(changed > 5);
  assert.equal(a.group.position.length(), 0);
});
check('Morte e reinício do round mudam a animação sem deformar a entidade', () => {
  const a = all[1];
  a.setAlive(false);
  a.animate(false, 1, false, 0.05);
  assert.ok(a.mixer._actions.some((x) => x.getClip().name === 'Death' && x.isRunning()));
  a.setAlive(true);
  a.animate(false, 1, false, 0.05);
  assert.equal(a.group.rotation.z, 0);
});
check('Todas as armas do arsenal possuem modelo importado e boca finita', () => {
  for (const [id, w] of Object.entries(WEAPONS)) {
    const m = createImportedWeapon(id, w, '#84e6d2');
    assert.ok(m?.imported, id);
    assert.ok(m.muzzle.toArray().every(Number.isFinite));
    assert.ok(m.muzzle.z < -0.1);
  }
});
check('Pistola, rifle, escopeta, precisão e faca usam silhuetas distintas', () => {
  assert.equal(new Set(['pulse', 'marshal', 'nova', 'operator', 'knife'].map(weaponAsset)).size, 5);
});
check('Trocar a arma do personagem exibe só o acessório selecionado', () => {
  const a = all[0];
  a.setWeapon('pulse');
  a.animate(false, 0, false, 0.05);
  assert.equal(a.visual.getObjectByName('Pistol').visible, true);
  assert.equal(a.visual.getObjectByName('AK').visible, false);
});
check('Raios de tiro atingem a cabeça e o corpo invisíveis do personagem', () => {
  const a = all[2];
  a.group.updateMatrixWorld(true);
  const ray = new T.Raycaster(new T.Vector3(0, 1.81, -5), new T.Vector3(0, 0, 1));
  const hits = ray.intersectObjects(a.targets);
  assert.ok(hits.length);
  assert.equal(hits[0].object.userData.head, true);
});
const manifest = JSON.parse(
  await fs.readFile(new URL('../assets/models/manifest.json', import.meta.url)),
);
check('Biblioteca convertida fica abaixo de cinco megabytes', () =>
  assert.ok(manifest.reduce((n, a) => n + a.bytes, 0) < 5 * 1024 * 1024),
);
console.log(`${count} verificações dos modelos passaram.`);
