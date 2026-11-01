import * as T from './vendor/three.module.js';
import { upgradeLighting, batchStatics } from './art.js';
import { LOOKS } from './data.js';
import { createImportedSoldier } from './models.js';

import { buildArena } from './arena.js';
import { MAP, SITES, SPAWNS, CALLOUTS, MAP_SCALE, fromMapPoint } from './map-layout.js';
export { MAP, SITES, SPAWNS, CALLOUTS };
export const BLOCKS = [];
export function createWorld(renderer) {
  BLOCKS.length = 0;
  const scene = new T.Scene();
  scene.background = new T.Color('#b7d8dc');
  scene.fog = new T.Fog('#bed7d6', 45, 145);
  const obstacles = [],
    props = new T.Group();
  scene.add(props);
  const materials = {};
  const mat = (c) =>
    materials[c] || (materials[c] = new T.MeshStandardMaterial({ color: c, roughness: 0.88 }));
  function box(x, y, z, w, h, d, c, solid = false, rotation = 0) {
    let m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof c === 'string' ? mat(c) : c);
    m.position.set(x, y, z);
    m.rotation.y = rotation;
    m.castShadow = true;
    m.receiveShadow = true;
    props.add(m);
    if (solid) {
      obstacles.push(m);
      BLOCKS.push({ x, z, w, d, h: y + h / 2, bottom: y - h / 2 });
    }
    return m;
  }
  function cylinder(x, y, z, rt, rb, h, c, sides = 12) {
    const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, sides), mat(c));
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    props.add(m);
    return m;
  }
  function texture(color, style) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d');
    c.fillStyle = color;
    c.fillRect(0, 0, 256, 256);
    let seed = 18;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 18000; i++) {
      c.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '40,25,20'},${rand() * 0.07})`;
      c.fillRect(rand() * 256, rand() * 256, 2, 2);
    }
    if (style === 'floor') {
      c.strokeStyle = '#85796744';
      c.lineWidth = 2;
      for (let y = 0; y < 256; y += 64) {
        for (let x = 0; x < 256; x += 64) {
          c.strokeRect(x + (y % 128 ? 32 : 0), y, 64, 64);
        }
      }
    }
    const t = new T.CanvasTexture(canvas);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.colorSpace = T.SRGBColorSpace;
    t.repeat.set(style === 'floor' ? 16 : 2, style === 'floor' ? 18 : 2);
    t.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    return t;
  }
  const floor = new T.Mesh(
    new T.PlaneGeometry(140, 140),
    new T.MeshStandardMaterial({ map: texture('#c4b69a', 'floor'), roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new T.HemisphereLight('#c6e4ff', '#b5a388', 1.65));
  const sun = new T.DirectionalLight('#fff0cf', 3.3);
  sun.position.set(-38, 55, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -78;
  sun.shadow.camera.right = 78;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new T.DirectionalLight('#bddfff', 0.65);
  fill.position.set(22, 12, -18);
  scene.add(fill);
  upgradeLighting(scene);
  function label(text, x, y, z, color = '#eceddf', size = 256, rotation = 0) {
    const can = document.createElement('canvas');
    can.width = 512;
    can.height = size;
    const c = can.getContext('2d');
    c.fillStyle = color;
    c.font = `bold ${size * 0.65}px Bahnschrift,Arial`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 256, size / 2);
    const m = new T.Mesh(
      new T.PlaneGeometry(4, size / 64),
      new T.MeshBasicMaterial({
        map: new T.CanvasTexture(can),
        transparent: true,
        depthWrite: false,
        side: T.DoubleSide,
      }),
    );
    m.position.set(x, y, z);
    m.rotation.y = rotation;
    props.add(m);
    return m;
  }
  buildArena({ props, box, cylinder, label, mat, floorTexture: floor.material.map });
  props.scale.set(MAP_SCALE, 1, MAP_SCALE);
  for (const b of BLOCKS) for (const key of ['x', 'z', 'w', 'd']) b[key] *= MAP_SCALE;
  batchStatics(props);
  function blocked(x, z, r = 0.4, feet = 0) {
    return BLOCKS.some(
      (b) =>
        feet + 1.75 > (b.bottom || 0) &&
        feet < b.h - 0.05 &&
        Math.abs(x - b.x) < b.w / 2 + r &&
        Math.abs(z - b.z) < b.d / 2 + r,
    );
  }
  function move(pos, dx, dz, r = 0.4, feet = 0) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.18));
    for (let i = 0; i < steps; i++) {
      if (!blocked(pos.x + dx / steps, pos.z, r, feet)) pos.x += dx / steps;
      if (!blocked(pos.x, pos.z + dz / steps, r, feet)) pos.z += dz / steps;
    }
  }
  function groundHeight(x, z, maximum) {
    let floor = 0;
    for (const b of BLOCKS)
      if (
        b.h <= maximum + 0.01 &&
        b.h > floor &&
        Math.abs(x - b.x) < b.w / 2 &&
        Math.abs(z - b.z) < b.d / 2
      )
        floor = b.h;
    return floor;
  }
  function ceilingHeight(x, z, head) {
    let ceiling = Infinity;
    for (const b of BLOCKS)
      if (
        (b.bottom || 0) >= head - 0.01 &&
        b.bottom < ceiling &&
        Math.abs(x - b.x) < b.w / 2 + 0.25 &&
        Math.abs(z - b.z) < b.d / 2 + 0.25
      )
        ceiling = b.bottom;
    return ceiling;
  }
  const ray = new T.Raycaster();
  function clearLine(a, b) {
    const delta = new T.Vector3().subVectors(b, a);
    ray.set(a, delta.clone().normalize());
    ray.far = delta.length();
    return ray.intersectObjects(obstacles, false).length === 0;
  }
  const grid = 2,
    cols = MAP.halfWidth + 1,
    rows = MAP.halfDepth + 1;
  const index = (x, z) => {
    const gx = Math.max(0, Math.min(cols - 1, Math.round((x + MAP.halfWidth) / grid)));
    const gz = Math.max(0, Math.min(rows - 1, Math.round((z + MAP.halfDepth) / grid)));
    return gz * cols + gx;
  };
  const point = (i) => ({
    x: (i % cols) * grid - MAP.halfWidth,
    z: Math.floor(i / cols) * grid - MAP.halfDepth,
  });
  const valid = Array.from({ length: cols * rows }, (_, i) => {
    const p = point(i);
    return !blocked(p.x, p.z, 0.55);
  });
  function path(start, end) {
    let src = index(start.x, start.z),
      dst = index(end.x, end.z);
    if (!valid[dst]) {
      let best = Infinity;
      for (let i = 0; i < valid.length; i++)
        if (valid[i]) {
          const p = point(i),
            d = Math.hypot(p.x - end.x, p.z - end.z);
          if (d < best) {
            best = d;
            dst = i;
          }
        }
    }
    const queue = [src],
      prev = new Int32Array(valid.length).fill(-1);
    prev[src] = src;
    for (let n = 0; n < queue.length; n++) {
      const v = queue[n];
      if (v === dst) break;
      const x = v % cols,
        z = Math.floor(v / cols);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          nz = z + dz,
          ni = nz * cols + nx;
        if (nx < 0 || nx >= cols || nz < 0 || nz >= rows || !valid[ni] || prev[ni] !== -1) continue;
        prev[ni] = v;
        queue.push(ni);
      }
    }
    if (prev[dst] === -1) return [];
    const route = [];
    for (let v = dst; v !== src; v = prev[v]) route.push(point(v));
    route.reverse();
    return route;
  }
  let buyObjects = [],
    buyBlocks = [];
  function setBuyPhase(active) {
    for (const obj of buyObjects) {
      scene.remove(obj);
      const i = obstacles.indexOf(obj);
      if (i >= 0) obstacles.splice(i, 1);
      obj.geometry?.dispose();
      obj.material?.dispose();
    }
    for (const block of buyBlocks) {
      const i = BLOCKS.indexOf(block);
      if (i >= 0) BLOCKS.splice(i, 1);
    }
    buyObjects = [];
    buyBlocks = [];
    if (!active) return;
    for (const z of [MAP.attackBarrier, MAP.defenseBarrier]) {
      const material = new T.MeshStandardMaterial({
        color: '#70dfea',
        emissive: '#3aa4b8',
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.2,
        side: T.DoubleSide,
        depthWrite: false,
      });
      const wall = new T.Mesh(new T.BoxGeometry(MAP.halfWidth * 2, 4.8, 0.24), material);
      wall.position.set(0, 2.4, z);
      scene.add(wall);
      wall.updateMatrixWorld(true);
      obstacles.push(wall);
      buyObjects.push(wall);
      const block = { x: 0, z, w: MAP.halfWidth * 2, d: 0.24, h: 4.8, bottom: 0, buy: true };
      BLOCKS.push(block);
      buyBlocks.push(block);
      const points = [];
      for (let x = -MAP.halfWidth; x <= MAP.halfWidth; x += 2) {
        points.push(new T.Vector3(x, 0, z), new T.Vector3(x, 4.8, z));
      }
      for (let y = 0; y <= 4.8; y += 0.6) {
        points.push(new T.Vector3(-MAP.halfWidth, y, z), new T.Vector3(MAP.halfWidth, y, z));
      }
      const grid = new T.LineSegments(
        new T.BufferGeometry().setFromPoints(points),
        new T.LineBasicMaterial({ color: '#a0fff5', transparent: true, opacity: 0.55 }),
      );
      scene.add(grid);
      buyObjects.push(grid);
    }
  }
  function inBuyZone(p, attacking) {
    return (
      Math.abs(p.x) < MAP.halfWidth &&
      (attacking ? p.z > MAP.attackBarrier + 0.5 : p.z < MAP.defenseBarrier - 0.5)
    );
  }
  function animateBuy(time) {
    for (const obj of buyObjects)
      if (obj.isMesh) obj.material.opacity = 0.17 + Math.sin(time * 2) * 0.035;
  }
  function zone(p) {
    for (const site of SITES)
      if (Math.hypot(p.x - site.x, p.z - site.z) < site.r + 2) return 'PONTO ' + site.name;
    if (p.z > MAP.attackBarrier) return 'BASE ATACANTE';
    if (p.z < MAP.defenseBarrier) return 'BASE DEFENSORA / ROTAÇÃO';
    p = fromMapPoint(p);
    if (p.x < -35) return 'JARDIM LONGO';
    if (p.x > 35) return 'CANAL LONGO';
    if (p.x > -20 && p.x < -8 && p.z > 8 && p.z < 16) return 'PASSAGEM DA PRAÇA A';
    if (p.x > 12 && p.x < 24 && p.z > 8 && p.z < 16) return 'PASSAGEM DA PRAÇA B';
    if (p.x < -24 && p.z > 10 && p.z < 18) return 'TÚNEL DAS FLORES';
    if (p.x < -19 && p.z > 5) return 'GALERIAS / TÚNEL DAS FLORES';
    if (p.x > 21 && p.z > 5) return 'ARMAZÉM';
    if (p.x < -26 && p.z < 5) return 'ENTRADA PRINCIPAL A';
    if (p.x > 26 && p.z < 5) return 'ENTRADA PRINCIPAL B';
    if (p.x < -19 && p.z >= 0) return 'ÁTRIO A';
    if (p.x > 21 && p.z >= 0) return 'PÁTIO B';
    if (p.x < -8 && p.z < 2) return 'CURTO A';
    if (p.x > 8 && p.z < 2) return 'CURTO B';
    if (p.z < -6) return 'TORRE / LIGAÇÃO DA DEFESA';
    return 'PRAÇA CENTRAL';
  }
  return {
    scene,
    props,
    obstacles,
    blocked,
    move,
    clearLine,
    path,
    sun,
    box,
    mat,
    zone,
    setBuyPhase,
    inBuyZone,
    animateBuy,
    groundHeight,
    ceilingHeight,
  };
}

export function createSoldier(color, enemy = false, identity = 'vex') {
  const imported = createImportedSoldier(color, enemy, identity);
  if (imported) return imported;
  const look = LOOKS[identity] || LOOKS.vex;
  const group = new T.Group(),
    targets = [],
    limbs = [];
  const uniform = new T.MeshStandardMaterial({
      color: enemy ? '#59474c' : '#344952',
      roughness: 0.85,
    }),
    armor = new T.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15 }),
    dark = new T.MeshStandardMaterial({ color: '#1c2b32', roughness: 0.72 }),
    skin = new T.MeshStandardMaterial({ color: look.skin, roughness: 0.82 });
  function mesh(geo, x, y, z, m, head = false, parent = group) {
    const o = new T.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    o.userData.head = head;
    targets.push(o);
    return o;
  }
  function part(w, h, d, x, y, z, m, head = false, parent = group) {
    return mesh(new T.BoxGeometry(w, h, d), x, y, z, m, head, parent);
  }
  function capsule(r, h, x, y, z, m, parent = group) {
    return mesh(new T.CapsuleGeometry(r, h, 3, 8), x, y, z, m, false, parent);
  }
  function plate(x, y, z, width, height, depth, material) {
    const s = new T.Shape();
    s.moveTo(-width * 0.35, -height * 0.5);
    s.lineTo(width * 0.35, -height * 0.5);
    s.lineTo(width * 0.5, height * 0.25);
    s.lineTo(width * 0.32, height * 0.5);
    s.lineTo(-width * 0.32, height * 0.5);
    s.lineTo(-width * 0.5, height * 0.25);
    s.closePath();
    const geo = new T.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      bevelSegments: 2,
      steps: 1,
    });
    geo.translate(0, 0, -depth / 2);
    return mesh(geo, x, y, z, material);
  }
  // Tapered body armor, rounded joints and a compact tactical silhouette.
  const torso = mesh(new T.CylinderGeometry(0.29, 0.23, 0.62, 6), 0, 1.22, 0, uniform);
  torso.scale.z = 0.63;
  plate(0, 1.31, -0.19, 0.5, 0.4, 0.12, armor);
  part(0.46, 0.35, 0.09, 0, 1.31, 0.18, dark);
  part(0.44, 0.12, 0.28, 0, 0.92, 0, dark);
  for (const x of [-0.15, 0, 0.15]) part(0.105, 0.16, 0.07, x, 1.17, -0.27, dark);
  const light = new T.MeshStandardMaterial({ color: '#b8c7c4', metalness: 0.35, roughness: 0.5 });
  const glow = new T.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    metalness: 0.2,
    roughness: 0.3,
  });
  for (const x of [-0.21, 0.21]) {
    part(0.055, 0.5, 0.045, x, 1.31, -0.2, dark);
    part(0.07, 0.065, 0.06, x, 1.28, -0.26, light);
    part(0.13, 0.19, 0.09, x, 0.94, -0.18, uniform);
  }
  part(0.23, 0.035, 0.035, 0, 1.49, -0.27, light);
  part(0.09, 0.025, 0.035, 0.11, 1.38, -0.27, glow);
  capsule(0.085, 0.09, 0, 1.61, 0, skin);
  const head = mesh(new T.SphereGeometry(0.185, 10, 8), 0, 1.8, -0.01, skin, true);
  head.scale.set(0.87, 1.17, 0.94);
  const helmet = mesh(
    new T.SphereGeometry(0.205, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.54),
    0,
    1.84,
    0,
    dark,
    true,
  );
  helmet.scale.z = 1.05;
  helmet.material = new T.MeshStandardMaterial({
    color: look.style === 'helmet' ? '#354c61' : look.hair,
    roughness: 0.78,
  });
  if (['helmet', 'cloak', 'ponytail'].includes(look.style)) {
    part(0.29, 0.065, 0.04, 0, 1.84, -0.18, glow, true);
    part(0.3, 0.025, 0.045, 0, 1.83, -0.2, dark, true);
  } else {
    for (const side of [-1, 1]) {
      part(0.062, 0.032, 0.012, side * 0.065, 1.823, -0.177, light, true);
      part(0.024, 0.026, 0.014, side * 0.06, 1.823, -0.186, dark, true);
      const brow = part(0.074, 0.017, 0.012, side * 0.068, 1.86, -0.166, helmet.material, true);
      brow.rotation.z = -side * 0.1;
    }
  }
  if (['helmet', 'cloak'].includes(look.style)) part(0.2, 0.08, 0.04, 0, 1.69, -0.16, dark, true);
  else
    part(
      0.075,
      0.012,
      0.012,
      0,
      1.7,
      -0.158,
      new T.MeshStandardMaterial({ color: '#865f56', roughness: 1 }),
      true,
    );
  // Agent-specific silhouettes and equipment preserve the same competitive hitbox.
  if (['hood', 'cloak'].includes(look.style)) {
    const hood = mesh(
      new T.SphereGeometry(0.245, 14, 10, -Math.PI * 0.2, Math.PI * 1.4, 0, Math.PI * 0.78),
      0,
      1.81,
      0.055,
      armor,
    );
    hood.scale.set(1, 1.17, 1);
    for (const side of [-1, 1]) {
      const tail = plate(side * 0.16, 0.87, 0.18, 0.27, 0.7, 0.07, armor);
      tail.rotation.x = -0.16;
      tail.rotation.z = -side * 0.12;
    }
  } else if (look.style === 'spikes') {
    for (let i = 0; i < 6; i++) {
      const spike = mesh(
        new T.ConeGeometry(0.065, 0.19 + (i % 2) * 0.06, 5),
        -0.16 + i * 0.062,
        2.025,
        0.01 + (i % 2) * 0.03,
        helmet.material,
      );
      spike.rotation.z = 0.25 - i * 0.09;
    }
  } else if (look.style === 'swept') {
    const fringe = mesh(
      new T.SphereGeometry(0.19, 12, 8, 0, Math.PI * 1.45, 0, Math.PI * 0.5),
      -0.02,
      1.99,
      -0.04,
      helmet.material,
    );
    fringe.rotation.z = -0.25;
  } else if (look.style === 'ponytail') {
    const pony = capsule(0.075, 0.3, 0, 1.72, 0.22, helmet.material);
    pony.rotation.x = -0.35;
    part(0.35, 0.08, 0.08, 0, 1.87, -0.19, dark, true);
    part(0.29, 0.047, 0.02, 0, 1.88, -0.237, glow, true);
  } else if (look.style === 'bob') {
    for (const side of [-1, 1]) {
      const lock = capsule(0.06, 0.18, side * 0.16, 1.77, 0.02, helmet.material);
      lock.rotation.z = -side * 0.1;
    }
  } else if (look.style === 'helmet') {
    plate(0, 1.95, -0.19, 0.34, 0.14, 0.055, armor);
    part(0.42, 0.05, 0.4, 0, 1.87, 0, dark, true);
  }
  part(0.035, 0.07, 0.065, 0, 1.77, -0.183, skin, true);
  if (identity === 'meda') {
    part(0.31, 0.42, 0.17, 0, 1.25, 0.28, light);
    part(0.17, 0.045, 0.015, 0, 1.28, 0.375, glow);
    part(0.045, 0.17, 0.015, 0, 1.28, 0.38, glow);
  }
  if (identity === 'rook' || identity === 'aegis') {
    part(0.42, 0.46, 0.17, 0, 1.29, 0.27, armor);
    for (const side of [-1, 1]) capsule(0.06, 0.2, side * 0.17, 1.3, 0.39, dark);
  }
  if (identity === 'kite') {
    part(0.16, 0.2, 0.13, -0.29, 1.28, 0.12, light);
    part(0.025, 0.42, 0.025, -0.31, 1.59, 0.15, dark);
  }
  for (const side of [-1, 1]) {
    const ear = mesh(
      new T.CylinderGeometry(0.054, 0.054, 0.03, 12),
      side * 0.171,
      1.81,
      0,
      dark,
      true,
    );
    ear.rotation.z = Math.PI / 2;
    part(0.025, 0.035, 0.13, side * 0.17, 1.72, -0.07, dark, true);
  }
  for (const side of [-1, 1]) {
    const leg = new T.Group();
    leg.position.set(side * 0.16, 0.84, 0);
    group.add(leg);
    limbs.push(leg);
    capsule(0.1, 0.32, 0, -0.23, 0, uniform, leg);
    capsule(0.085, 0.28, 0, -0.57, 0.01, dark, leg);
    part(0.14, 0.16, 0.08, 0, -0.42, -0.09, armor, false, leg);
    part(0.19, 0.13, 0.32, 0, -0.76, -0.06, dark, false, leg);
    part(0.18, 0.025, 0.31, 0, -0.81, -0.06, light, false, leg);
    part(0.13, 0.1, 0.04, 0, -0.42, -0.14, dark, false, leg);
    capsule(0.115, 0.18, side * 0.35, 1.32, -0.03, uniform).rotation.z = side * 0.2;
    const forearm = capsule(0.085, 0.27, side * 0.3, 1.14, -0.25, uniform);
    forearm.rotation.x = -1.1;
    part(0.14, 0.13, 0.19, side * 0.29, 1.15, -0.43, dark);
    const shoulder = plate(side * 0.35, 1.47, -0.025, 0.23, 0.18, 0.28, side < 0 ? armor : dark);
    shoulder.rotation.z = -side * 0.2;
    part(0.15, 0.035, 0.03, side * 0.35, 1.49, -0.18, light);
  }
  plate(0.18, 1.26, -0.51, 0.13, 0.14, 0.62, dark);
  const barrel = mesh(new T.CylinderGeometry(0.023, 0.023, 0.34, 12), 0.18, 1.28, -0.93, dark);
  barrel.rotation.x = Math.PI / 2;
  const muzzleRing = mesh(
    new T.CylinderGeometry(0.034, 0.034, 0.065, 12),
    0.18,
    1.28,
    -1.11,
    light,
  );
  muzzleRing.rotation.x = Math.PI / 2;
  const bore = mesh(
    new T.CylinderGeometry(0.024, 0.024, 0.004, 12),
    0.18,
    1.28,
    -1.146,
    new T.MeshBasicMaterial({ color: '#09151d' }),
  );
  bore.rotation.x = Math.PI / 2;
  part(0.055, 0.045, 0.15, 0.18, 1.38, -0.47, dark);
  part(0.07, 0.18, 0.12, 0.18, 1.14, -0.48, dark).rotation.x = 0.16;
  part(0.013, 0.025, 0.09, 0.251, 1.28, -0.4, light);
  part(0.014, 0.018, 0.1, 0.251, 1.24, -0.6, glow);
  for (let i = 0; i < 5; i++) part(0.14, 0.016, 0.025, 0.18, 1.35, -0.55 - i * 0.055, light);
  // Batch the visual body and each leg, then use a small set of invisible hit proxies.
  batchStatics(group);
  for (const limb of limbs) batchStatics(limb);
  targets.length = 0;
  const hitMaterial = new T.MeshBasicMaterial({ visible: false });
  function hit(geo, x, y, z, head = false) {
    const target = new T.Mesh(geo, hitMaterial);
    target.position.set(x, y, z);
    target.visible = false;
    target.userData.head = head;
    group.add(target);
    targets.push(target);
  }
  hit(new T.SphereGeometry(0.205, 12, 10), 0, 1.81, 0, true);
  hit(new T.CapsuleGeometry(0.25, 0.38, 3, 8), 0, 1.23, 0);
  for (const side of [-1, 1]) {
    hit(new T.CapsuleGeometry(0.105, 0.58, 3, 8), side * 0.16, 0.49, 0);
    hit(new T.CapsuleGeometry(0.115, 0.3, 3, 8), side * 0.35, 1.22, -0.08);
  }
  const muzzle = new T.Mesh(
    new T.OctahedronGeometry(0.095),
    new T.MeshBasicMaterial({ color: '#ffd598', transparent: true, opacity: 0.85 }),
  );
  muzzle.position.set(0.18, 1.28, -1.14);
  muzzle.visible = false;
  group.add(muzzle);
  const ring = new T.Mesh(
    new T.RingGeometry(0.36, 0.43, 24),
    new T.MeshBasicMaterial({
      color: enemy ? '#ff6979' : color,
      transparent: true,
      opacity: 0.55,
      side: T.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  group.add(ring);
  const badge = new T.Mesh(
    new T.OctahedronGeometry(0.09),
    new T.MeshBasicMaterial({ color: enemy ? '#ff6979' : color }),
  );
  badge.position.y = 2.3;
  group.add(badge);
  function animate(walking, time, aiming = false) {
    limbs[0].rotation.x = walking ? Math.sin(time) * 0.48 : 0;
    limbs[1].rotation.x = walking ? -Math.sin(time) * 0.48 : 0;
    badge.position.y = 2.3 + Math.sin(time * 0.5) * 0.025;
  }
  return { group, targets, limbs, badge, muzzle, animate };
}
