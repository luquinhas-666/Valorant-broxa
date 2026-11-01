import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from '../vendor/three.module.js';
import { CombatFeedback, impactAngle } from '../combat-fx.js';
import { createImportedSoldier, loadModelAssets } from '../models.js';
let count = 0;
function check(name, fn) {
  fn();
  count++;
  console.log('PASS', name);
}
await loadModelAssets(async (url) => {
  const b = await fs.readFile(url);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
});
const scene = new T.Scene(),
  camera = new T.PerspectiveCamera();
const classes = new Set(),
  ui = {
    canvas: { classList: { add: (x) => classes.add(x), remove: (x) => classes.delete(x) } },
    flash: { style: {} },
    direction: { style: {} },
    killer: {},
  };
const fx = new CombatFeedback(scene, ui),
  actor = { pos: { x: 0, z: 0 }, team: 1, model: createImportedSoldier('#ab9977', true, 'vex') };
scene.add(actor.model.group);
const player = { alive: true, hp: 70 };
check('Indicador acompanha tiros pela frente, direita, trás e rotação do jogador', () => {
  assert.equal(impactAngle(actor.pos, { x: 0, z: -4 }), 0);
  assert.equal(impactAngle(actor.pos, { x: 4, z: 0 }), Math.PI / 2);
  assert.equal(impactAngle(actor.pos, { x: 0, z: 4 }), Math.PI);
  assert.ok(Math.abs(impactAngle(actor.pos, { x: 0, z: -4 }, Math.PI / 2) - Math.PI / 2) < 1e-8);
  assert.equal(impactAngle(actor.pos, null), null);
});
const centres = actor.model.targets.map((t) => t.position.toArray());
fx.impact(actor, { shielded: true });
fx.hurt(actor.pos, { x: 4, z: 0 }, 30);
fx.update(0.02, camera, player);
check('Dano ativa vinheta e direção sem deslocar hitboxes', () => {
  assert.ok(ui.flash.style.opacity > 0);
  assert.ok(ui.direction.style.opacity > 0);
  assert.deepEqual(
    actor.model.targets.map((t) => t.position.toArray()),
    centres,
  );
  assert.ok(fx.flashes.size === 1 && fx.bursts.length === 1);
});
check('Escudo usa partículas azuis e reação limitada à parte visual', () => {
  assert.equal(fx.bursts[0].points.material.color.getHexString(), '83e9ff');
  assert.notEqual(actor.model.visual.rotation.z, 0);
  assert.equal(actor.model.group.rotation.z, 0);
});
fx.update(0.7, camera, player);
check('Reação, materiais e partículas voltam ao estado original', () => {
  assert.equal(fx.flashes.size, 0);
  assert.equal(fx.bursts.length, 0);
  assert.equal(actor.model.visual.rotation.z, 0);
  assert.equal(ui.flash.style.opacity, 0);
});
fx.die({ ...actor.pos, y: 2 }, 0, 'SOL');
fx.eliminate(actor);
check('Morte mostra autor, partículas e câmera na altura correta da cobertura', () => {
  assert.equal(ui.killer.textContent, 'ELIMINADO POR SOL');
  assert.ok(classes.has('death-view'));
  assert.ok(fx.deathCamera(camera));
  assert.equal(camera.position.y, 3.7);
  assert.ok(fx.bursts[0].ring);
});
fx.update(0.8, camera, { alive: false, hp: 0 });
fx.deathCamera(camera);
check('Câmera cai suavemente antes da passagem ao espectador', () => {
  assert.ok(camera.position.y < 2.5);
  assert.ok(camera.rotation.z < 0);
  fx.update(0.1, camera, { alive: false, hp: 0 });
  assert.equal(fx.deathCamera(camera), false);
  assert.equal(classes.has('death-view'), false);
});
check('Rajadas mantêm um limite de partículas e liberam recursos ao reiniciar', () => {
  for (let i = 0; i < 50; i++) fx.burst(actor.pos, '#ffffff', true);
  assert.equal(fx.bursts.length, 24);
  fx.reset();
  assert.equal(fx.bursts.length, 0);
  assert.equal(scene.children.length, 1);
  assert.equal(ui.direction.style.opacity, 0);
});
console.log(`${count} verificações de efeitos passaram.`);
