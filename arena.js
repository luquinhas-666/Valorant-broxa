import { textureBox, environmentModel } from './environment.js';
import * as T from './vendor/three.module.js';
import { LAYOUT } from './map-layout.js';
const { MAP, AREAS, SITES, CALLOUTS } = LAYOUT;
const playable = (x, z) =>
  AREAS.some((a) => Math.abs(x - a.x) <= a.w / 2 && Math.abs(z - a.z) <= a.d / 2);

export function buildArena({ props, box, cylinder, label, mat, floorTexture }) {
  // Greedy rectangles turn the non-playable cells into solid, efficient building blocks.
  const cell = 2,
    n = MAP.halfWidth,
    count = n,
    used = new Set();
  const solid = (x, z) => !playable(-n + x * cell + 1, -n + z * cell + 1);
  for (let z = 0; z < count; z++)
    for (let x = 0; x < count; x++) {
      const key = z * count + x;
      if (used.has(key) || !solid(x, z)) continue;
      let w = 1,
        d = 1;
      while (x + w < count && !used.has(z * count + x + w) && solid(x + w, z)) w++;
      outer: while (z + d < count) {
        for (let i = 0; i < w; i++)
          if (used.has((z + d) * count + x + i) || !solid(x + i, z + d)) break outer;
        d++;
      }
      for (let dz = 0; dz < d; dz++)
        for (let dx = 0; dx < w; dx++) used.add((z + dz) * count + x + dx);
      const cx = -n + x * cell + w,
        cz = -n + z * cell + d,
        height = 7 + ((x * 3 + z) % 4) * 0.8;
      const color = cx > 16 ? '#a4b6b2' : cx < -16 ? '#d5b79a' : '#ce9c80';
      textureBox(
        box(cx, height / 2, cz, w * cell, height, d * cell, color, true),
        'plaster',
        color,
      );
      box(cx, height + 0.12, cz, w * cell + 0.16, 0.24, d * cell + 0.16, '#e4d3b7');
      box(cx, 0.32, cz, w * cell + 0.08, 0.64, d * cell + 0.08, '#9f9c8c');
      // Recessed windows appear only on faces adjoining playable cells.
      for (let dx = 0; dx < w; dx += 2)
        for (const sign of [-1, 1]) {
          const wx = -n + (x + dx) * cell + 1,
            wz = cz + (sign * d * cell) / 2;
          if (!playable(wx, wz + sign)) continue;
          box(wx, 4.8, wz + sign * 0.045, 1.1, 1.7, 0.07, '#39575b');
          box(wx, 3.86, wz + sign * 0.08, 1.4, 0.18, 0.2, '#e2c8a6');
          box(wx, 5.74, wz + sign * 0.08, 1.4, 0.18, 0.2, '#e2c8a6');
        }
    }
  // Boundary walls sit outside the navigable footprint.
  for (const side of [-1, 1]) {
    box(side * 49, 4, 0, 2, 8, 100, '#cfb99b', true);
    box(0, 4, side * 49, 100, 8, 2, '#c5ad93', true);
  }
  for (const [i, a] of AREAS.entries()) {
    const map = floorTexture.clone();
    map.repeat.set(a.w / 4, a.d / 4);
    const floor = box(
      a.x,
      0.009 + i * 0.00015,
      a.z,
      a.w,
      0.016,
      a.d,
      new T.MeshStandardMaterial({ map, color: a.color, roughness: 1 }),
    );
    textureBox(floor, a.x > 18 ? 'concrete' : 'paving', a.color);
    floor.receiveShadow = true;
    floor.castShadow = false;
  }
  function cover(x, z, w, d, h, color = '#768c85') {
    const asset = environmentModel(
      w > 5 ? 'Container_Long' : h > 2.2 ? 'Container_Small' : 'Crate',
      { x, z, w, d, h },
    );
    const collider = box(x, h / 2, z, w, h, d, color, true);
    if (asset) {
      collider.visible = false;
      props.add(asset);
      return;
    }
    textureBox(collider, 'concrete', color);
    box(x, h + 0.035, z, w + 0.08, 0.07, d + 0.08, '#344e4d');
    for (const side of [-1, 1]) {
      box(x + side * (w / 2 - 0.13), h / 2, z + d / 2 + 0.035, 0.14, h - 0.15, 0.07, '#c3c9aa');
      box(x, h - 0.16, z + side * (d / 2 + 0.04), w, 0.12, 0.08, '#a8beab');
    }
  }
  function portal(x, z, w, text) {
    for (const side of [-1, 1]) box(x + side * (w / 2 + 0.25), 2.4, z, 0.5, 4.8, 0.7, '#ddc8a7');
    box(x, 4.7, z, w + 1, 0.42, 0.8, '#d7bfa0');
    label(text, x, 3.9, z + 0.43, '#efe4c4', 64);
  }
  function roof(x, z, w, d) {
    box(x, 3.95, z, w, 0.3, d, '#b2a58d', true);
    for (const dx of [-w / 2 + 0.3, w / 2 - 0.3]) box(x + dx, 3.65, z, 0.16, 0.3, d, '#665c50');
  }
  // Sheltered A connector and warehouse create different acoustic/visual identities.
  const steel = new T.MeshStandardMaterial({ color: '#657d82', metalness: 0.65, roughness: 0.55 });
  box(28, 0.027, 14.5, 12, 0.02, 19, steel);
  for (let z = 6; z < 24; z += 3) box(28, 0.041, z, 12, 0.01, 0.045, '#a5b2a5');
  for (const x of [22.1, 33.9]) box(x, 0.042, 14.5, 0.12, 0.012, 19, '#d9bc77');
  roof(-32, 14, 16, 7.4);
  roof(-24, 20, 7.4, 10);
  roof(28, 16, 11.4, 12);
  for (const x of [23.5, 32.5]) for (const z of [11, 21]) box(x, 1.8, z, 0.3, 3.6, 0.3, '#4b6567');
  portal(-24, 27, 6.4, 'A · GALERIAS');
  portal(28, 27, 8, 'B · ARMAZÉM');
  portal(0, 26, 10, 'MEIO');
  portal(-32, -3, 7, 'A');
  portal(32, -3, 7, 'B');
  // Offset cover creates deliberate clearing sequences, without sealing a route.
  cover(-37.5, 7, 2.4, 4, 2.1, '#8d9f7a');
  cover(-26, 7, 2.3, 2.3, 1.25, '#b5a285');
  cover(-42, 22, 1.9, 3, 1.2, '#879a75');
  cover(42, 13, 2.2, 4, 1.25, '#6b8b8c');
  cover(25, 13, 2.5, 3.5, 2.35, '#6b8188');
  cover(35, 2, 2.4, 2.4, 1.25, '#9aab9c');
  // Split pushes must clear the near-side screen before entering the next lane.
  cover(-17, 10.5, 2, 3, 2.2, '#a4ad92');
  cover(18, 9, 2, 2.5, 2.2, '#7f9c9e');
  cover(0, -34, 6, 2, 2.2, '#899a99');
  // Mid has two peeking lanes around a kiosk and a solid tower preventing spawn snipes.
  cover(0, 19, 3.8, 3.8, 2.7, '#a47b61');
  box(0, 3, 19, 4.5, 0.2, 4.5, '#aa6960');
  label('PRAÇA', 0, 2.1, 20.94, '#f0dfbd', 70);
  label('TORRE', 0, 4, -7.95, '#f0dfbd', 100);
  cover(0, 3, 3.6, 4.5, 1.35, '#b19e81');
  cylinder(0, 1.9, 3, 0.5, 0.7, 1.2, '#b8ae95', 12);
  cover(-9, 9, 2.2, 2.2, 1.15, '#8c9b85');
  cover(9, -3, 2.1, 2.1, 2.2, '#8d9e95');
  // Staggered cover breaks the enlarged approach into separate peeks.
  cover(-27, 1, 2, 3, 2.1);
  cover(29, -1, 2, 3, 2.1);
  // Each site has a default plant, a deeper pocket and a crossfire-breaking main crate.
  cover(-34, -15, 3.4, 4.8, 2.8, '#547d6b');
  cover(-24, -22, 3, 3, 1.2, '#9fac91');
  cover(-40, -23, 2.2, 3.6, 2.4, '#8e9d7e');
  cover(34, -16, 3.6, 5.2, 2.9, '#507f89');
  cover(24, -23, 3.4, 2.4, 1.2, '#92a4a2');
  cover(40, -11, 2.3, 3.3, 2, '#899e9e');
  // Safe spawn props do not occupy the five spawn slots or the distributor.
  cover(-12, 42, 2.5, 3, 2, '#8f8d77');
  cover(12, 42, 2.5, 3, 2, '#8f8d77');
  for (const s of SITES) {
    const mark = new T.Mesh(
      new T.RingGeometry(s.r - 0.1, s.r, 64),
      new T.MeshBasicMaterial({
        color: '#f3d393',
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(s.x, 0.038, s.z);
    props.add(mark);
    const text = label(s.name, s.x, 0.045, s.z, '#ffe5a0', 200);
    text.rotation.x = -Math.PI / 2;
    text.scale.setScalar(1.5);
    for (const x of [s.x - 5, s.x + 5]) box(x, 0.035, s.z, 0.12, 0.03, 8, '#e6cc8e');
    label('PONTO ' + s.name, s.x, 3.2, -27.9, '#e9d6a4', 90);
    for (const side of [-1, 1]) {
      box(s.x + side * 7, 2.9, -27.75, 0.22, 1.8, 0.22, s.name === 'A' ? '#7da882' : '#659aaf');
      box(s.x + side * 7, 3.9, -27.75, 1.2, 0.12, 0.4, '#e2c89f');
    }
  }
  label('← A', -6, 2.7, 13.9, '#e9d7b0', 80, Math.PI);
  label('B →', 6, 2.7, 13.9, '#e9d7b0', 80, Math.PI);
  label('SANTA LUZ / DISTRITO', 0, 5.5, 46.02, '#f0deba', 70, Math.PI);
  label('ROTAÇÃO · A ←  → B', 0, 3, -37.95, '#e1ddc0', 60);
  for (const [x, z] of [
    [-41, 17],
    [-38, -1],
    [-22, 24],
    [-11, 5],
    [-41, -25],
    [10, 5],
  ]) {
    cylinder(x, 0.35, z, 0.38, 0.29, 0.7, '#a57957');
    for (let i = 0; i < 5; i++) {
      const leaf = new T.Mesh(
        new T.IcosahedronGeometry(0.55, 0),
        mat(i % 2 ? '#6a8765' : '#829b6c'),
      );
      leaf.position.set(x + Math.sin(i * 2) * 0.35, 1 + i * 0.18, z + Math.cos(i * 2) * 0.3);
      leaf.scale.set(0.7, 1.3, 0.7);
      props.add(leaf);
    }
  }
  // Utility lines, lanterns and signage make the routes legible at eye level.
  for (const [x, z] of [
    [-24, 9],
    [-40, -1],
    [28, 8],
    [40, -1],
    [-14, -4],
    [14, -4],
  ]) {
    const material = new T.MeshStandardMaterial({
      color: '#ffe2a1',
      emissive: '#efb660',
      emissiveIntensity: 0.7,
    });
    box(x, 3.2, z, 0.32, 0.6, 0.32, material);
  }
  for (const x of [-43.7, -36.3, 36.3, 43.7])
    for (let z = -2; z < 28; z += 2) {
      box(x, 0.035, z, 0.18, 0.025, 1.8, x < 0 ? '#a5b897' : '#7c9c9c');
    }
  for (const c of CALLOUTS.filter((c) => !c.text.startsWith('BASE'))) {
    // Small floor arrows remain readable without blocking silhouettes.
    box(c.x, 0.029, c.z - 1.5, 1.7, 0.025, 0.15, '#ded3af');
  }
  for (const [x, z] of [
    [-18, 22],
    [18, 24],
    [-45, -22],
    [45, -24],
    [-16, -28],
    [16, -28],
  ]) {
    const tree = environmentModel('Tree_1', { x, z, y: 5, w: 4, d: 4, h: 7 });
    if (tree) props.add(tree);
  }
  for (const [x, z] of [
    [-11, 10],
    [11, 10],
    [-39, 26],
    [39, 26],
  ]) {
    const lamp = environmentModel('StreetLight', { x, z, w: 1, d: 0.8, h: 5.5 });
    if (lamp) props.add(lamp);
    const pole = box(x, 2.5, z, 0.4, 5, 0.4, '#4b6567', true);
    if (lamp) pole.visible = false;
  }
  for (const [x, z] of [
    [-40, -26.5],
    [40, -25],
  ]) {
    const gas = environmentModel('GasTank', { x, z, w: 1, d: 1, h: 1.8 });
    if (gas) props.add(gas);
    const block = box(x, 0.9, z, 1, 1.8, 1, '#758783', true);
    if (gas) block.visible = false;
  }
  const dock = environmentModel('Pallet', { x: 25, z: 13, w: 2.7, d: 3.7, h: 0.18 });
  if (dock) props.add(dock);
  for (let i = 0; i < 26; i++) {
    const angle = (i * Math.PI * 2) / 26,
      radius = 70 + (i % 3) * 5,
      h = 10 + ((i * 7) % 13);
    box(
      Math.cos(angle) * radius,
      h / 2,
      Math.sin(angle) * radius,
      8,
      h,
      9,
      i % 2 ? '#bfb4a1' : '#b4bdb4',
    );
  }
}
