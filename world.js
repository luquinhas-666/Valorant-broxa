import * as T from './vendor/three.module.js';
import { upgradeLighting, decorateMap, batchStatics } from './art.js';
import { LOOKS } from './data.js';

export const SITES = [
  { name: 'A', x: -19, z: -10, r: 5.5 },
  { name: 'B', x: 19, z: -10, r: 5.5 },
];
export const BLOCKS = [];
export function createWorld(renderer) {
  BLOCKS.length = 0;
  const scene = new T.Scene();
  scene.background = new T.Color('#b7d8dc');
  scene.fog = new T.Fog('#bed7d6', 35, 115);
  const obstacles = [],
    decals = [],
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
  const plaster = new T.MeshStandardMaterial({
    color: '#f4e4c9',
    map: texture('#ded0b7', 'wall'),
    roughness: 1,
  });
  const terracotta = new T.MeshStandardMaterial({
    color: '#d7a084',
    map: texture('#d8bba3', 'wall'),
    roughness: 1,
  });
  const floor = new T.Mesh(
    new T.PlaneGeometry(76, 80),
    new T.MeshStandardMaterial({ map: texture('#c4b69a', 'floor'), roughness: 1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  scene.add(new T.HemisphereLight('#c6e4ff', '#b5a388', 1.65));
  const sun = new T.DirectionalLight('#fff0cf', 3.3);
  sun.position.set(-25, 32, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -39;
  sun.shadow.camera.right = 39;
  sun.shadow.camera.top = 41;
  sun.shadow.camera.bottom = -41;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 100;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new T.DirectionalLight('#bddfff', 0.65);
  fill.position.set(22, 12, -18);
  scene.add(fill);
  upgradeLighting(scene);
  // Perimeter and the buildings define three interconnected routes.
  box(-33, 4, 0, 2, 8, 72, plaster, true);
  box(33, 4, 0, 2, 8, 72, plaster, true);
  box(0, 4, -35, 68, 8, 2, terracotta, true);
  box(0, 3, 35, 68, 6, 2, plaster, true);
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
  function building(x, z, w, d, height, col) {
    if (d === 12 || x === 0) {
      const gap = 4.4,
        doorHeight = 3.35;
      for (const side of [-1, 1]) {
        for (const part of [-1, 1]) {
          box(
            x + (part * (w + gap)) / 4,
            height / 2,
            z + (side * d) / 2,
            (w - gap) / 2,
            height,
            0.55,
            col,
            true,
          );
          box(
            x + (side * w) / 2,
            height / 2,
            z + (part * (d + gap)) / 4,
            0.55,
            height,
            (d - gap) / 2,
            col,
            true,
          );
        }
        box(
          x,
          (height + doorHeight) / 2,
          z + (side * d) / 2,
          w,
          height - doorHeight,
          0.55,
          col,
          true,
        );
        box(
          x + (side * w) / 2,
          (height + doorHeight) / 2,
          z,
          0.55,
          height - doorHeight,
          d,
          col,
          true,
        );
        for (const edge of [-1, 1]) {
          box(
            x + edge * (gap / 2 + 0.12),
            1.7,
            z + side * (d / 2 + 0.1),
            0.23,
            3.4,
            0.25,
            '#d8c5a5',
          );
          box(
            x + side * (w / 2 + 0.1),
            1.7,
            z + edge * (gap / 2 + 0.12),
            0.25,
            3.4,
            0.23,
            '#d8c5a5',
          );
        }
      }
      box(x, height - 0.3, z, w, 0.28, d, col);
    } else box(x, height / 2, z, w, height, d, col, true);
    box(x, height + 0.14, z, w + 0.4, 0.28, d + 0.4, '#dfc8a7');
    box(x, height + 0.5, z - d / 2 + 0.1, w, 0.65, 0.35, '#e5ceae');
    box(x, 0.28, z + d / 2 + 0.04, w, 0.55, 0.1, '#a9957e');
    for (let dx = -w / 2 + 2; dx < w / 2 - 1; dx += 3.6) {
      for (const side of [-1, 1]) {
        const wz = z + side * (d / 2 + 0.31);
        box(x + dx, 4.4, wz, 1.25, 1.8, 0.1, '#425b5c');
        box(x + dx, 4.4, wz + side * 0.06, 0.08, 1.8, 0.12, '#dccbb0');
        box(x + dx, 4.4, wz + side * 0.06, 1.25, 0.08, 0.12, '#dccbb0');
        box(x + dx, 3.45, wz, 1.5, 0.18, 0.35, '#e1c8a5');
      }
    }
  }
  building(-16, 7, 16, 12, 8.5, plaster);
  building(16, 7, 16, 12, 7, terracotta);
  building(0, -13, 8, 9, 6, plaster);
  building(-17, -24, 14, 7, 9, terracotta);
  building(17, -24, 14, 7, 8, plaster);
  // Archways: the walkable opening is real geometry, never a solid rectangle.
  function arch(x, z, w = 7) {
    box(x - w / 2, 2.9, z, 1, 5.8, 1.3, '#dfccb0', true);
    box(x + w / 2, 2.9, z, 1, 5.8, 1.3, '#dfccb0', true);
    const shape = new T.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(w / 2, 2.3);
    shape.lineTo(-w / 2, 2.3);
    shape.closePath();
    const hole = new T.Path();
    hole.absarc(0, 0, w / 2 - 0.5, 0, Math.PI, false);
    hole.closePath();
    shape.holes.push(hole);
    const g = new T.ExtrudeGeometry(shape, { depth: 1.3, bevelEnabled: false, curveSegments: 18 });
    const m = new T.Mesh(g, mat('#dfccb0'));
    m.position.set(x, 3.9, z - 0.65);
    m.castShadow = true;
    m.receiveShadow = true;
    props.add(m);
    obstacles.push(m);
    box(x, 6.3, z, w + 1, 0.3, 1.6, '#ae8d6c');
  }
  arch(0, 15, 9);
  arch(-19, -18, 8);
  arch(19, -18, 8);
  // Cover has alternating wood, metal and radiant site crates.
  function crate(x, z, w = 2.7, d = 2.7, h = 2.8, rad = false) {
    box(x, h / 2, z, w, h, d, rad ? '#344e4a' : '#8c7659', true);
    const band = rad ? '#89ddbd' : '#b49b72';
    for (const dz of [-d / 2 - 0.02, d / 2 + 0.02]) {
      box(x, 0.18, z + dz, w, 0.16, 0.08, '#3c4946');
      box(x, h - 0.18, z + dz, w, 0.16, 0.08, '#3c4946');
      box(x - w / 2 + 0.13, h / 2, z + dz, 0.16, h, 0.08, band);
      box(x + w / 2 - 0.13, h / 2, z + dz, 0.16, h, 0.08, band);
      const m = box(x, h / 2, z + dz, w * 0.92, 0.12, 0.07, band);
      m.rotation.z = 0.65;
    }
    if (rad) {
      box(
        x,
        h / 2,
        z + d / 2 + 0.045,
        w * 0.64,
        h * 0.65,
        0.03,
        new T.MeshStandardMaterial({
          color: '#8edec1',
          emissive: '#5aaf8c',
          emissiveIntensity: 0.5,
          roughness: 0.5,
        }),
      );
      box(x, h + 0.025, z, w, 0.05, d, '#293f3c');
    }
  }
  crate(-3, 21, 2.5, 2.8, 2);
  crate(7, 19, 2.5, 3, 2.5);
  crate(-4, 0, 3, 3, 3);
  crate(6, -3, 2.6, 2.8, 2.5);
  crate(-22, -9, 3, 3, 3, true);
  crate(-17, -5.5, 2.7, 2.7, 2.7, true);
  crate(21, -12, 3, 4, 3, true);
  crate(15, -7, 3, 3, 2.8, true);
  crate(-8, -24, 2, 2, 2.5);
  crate(8, -24, 2, 2, 2.5);
  crate(-26, 17, 1.5, 2, 1.8);
  crate(26, 0, 1.5, 2, 1.8);
  crate(0, -13, 2, 2.4, 1.9);
  // A stone fountain breaks the center lane into two distinct peeking angles.
  box(-4, 0.43, 6, 2.65, 0.86, 2.65, '#b4ad99', true);
  cylinder(-4, 0.9, 6, 1.55, 1.55, 0.18, '#dad2b9', 16);
  const water = cylinder(-4, 1.005, 6, 1.27, 1.27, 0.025, '#6bacae', 24);
  water.material = new T.MeshStandardMaterial({
    color: '#71b8b4',
    metalness: 0.4,
    roughness: 0.15,
    transparent: true,
    opacity: 0.83,
  });
  cylinder(-4, 1.3, 6, 0.23, 0.35, 0.65, '#d7c7a8');
  cylinder(-4, 1.67, 6, 0.53, 0.18, 0.2, '#d7c7a8');
  // Angled entry choices, protected rotations and cover along the enlarged flank routes.
  box(-10.3, 1.25, -2, 0.65, 2.5, 5.5, '#c4b697', true);
  box(10.3, 1.25, -2, 0.65, 2.5, 5.5, '#bf947d', true);
  crate(-28, 11, 2.1, 2.1, 1.65);
  crate(28, 15, 2.1, 2.7, 2.1);
  crate(-29, -17, 2.5, 2, 2.5);
  crate(28, -25, 2.5, 3, 2.2);
  crate(-4, -21, 2.4, 2.4, 2.5);
  crate(5, -20, 2.4, 2.4, 2);
  box(-19, 1, -15.8, 4.5, 2, 0.75, '#a4b9a5', true);
  box(19, 1, -4.3, 4.5, 2, 0.75, '#bba180', true);
  // Ground markings and signs at the objective zones.
  for (const s of SITES) {
    const ring = new T.Mesh(
      new T.RingGeometry(5.2, 5.28, 48),
      new T.MeshBasicMaterial({
        color: '#efd688',
        transparent: true,
        opacity: 0.65,
        side: T.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s.x, 0.025, s.z);
    props.add(ring);
    const l = label(s.name, s.x, 0.04, s.z, '#f5df9b', 256);
    l.rotation.x = -Math.PI / 2;
    l.scale.setScalar(1.3);
    label(s.name, s.x, 4, -20.46, '#f8e5c0', 256);
    label(
      s.name === 'A' ? '← A' : 'B →',
      s.x > 0 ? 8.06 : -8.06,
      2.5,
      6,
      '#f0e3c9',
      150,
      s.x > 0 ? -Math.PI / 2 : Math.PI / 2,
    );
  }
  label('SANTA LUZ', 0, 4, 29.94, '#ddd5c1', 110, Math.PI);
  label('MERCADO', 0, 5.25, 14.3, '#8e6c57', 95);
  label('A ←', -4.04, 2, -12, '#876d58', 160, -Math.PI / 2);
  label('→ B', 4.04, 2, -12, '#876d58', 160, Math.PI / 2);
  // Cloth canopies, roof tiles, shutters, climbing flowers and vegetation.
  function canopy(x, z, w, d, color) {
    const geo = new T.PlaneGeometry(w, d, 12, 8);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i);
      p.setZ(i, -0.5 * Math.cos((px / w) * Math.PI) + Math.sin(p.getY(i) * 2) * 0.07);
    }
    geo.computeVertexNormals();
    const m = new T.Mesh(
      geo,
      new T.MeshStandardMaterial({ color, side: T.DoubleSide, roughness: 1 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 5.8, z);
    m.castShadow = true;
    props.add(m);
    for (const dx of [-w / 2, w / 2]) {
      const pole = cylinder(x + dx, 3, z, 0.045, 0.045, 6, '#514a42', 6);
      pole.castShadow = false;
    }
  }
  canopy(-19, -2, 9, 5, '#bc6365');
  canopy(18, 16, 8, 4, '#dca876');
  canopy(0, 5, 9, 6, '#bd6b6b');
  for (let i = 0; i < 14; i++) {
    const x = -27 + i * 4;
    box(x, 8.7, -30, 3.85, 0.2, 2.5, '#a05e4a');
  }
  let seed = 37;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  function plant(x, z, large = false) {
    cylinder(x, 0.35, z, 0.42, 0.3, 0.7, '#a36b54');
    for (let i = 0; i < (large ? 15 : 8); i++) {
      const m = new T.Mesh(
        new T.IcosahedronGeometry(large ? 0.65 : 0.38, 0),
        mat(i % 2 ? '#758967' : '#5b7e62'),
      );
      m.position.set(
        x + (rand() - 0.5) * (large ? 1.9 : 1),
        0.8 + rand() * (large ? 2 : 0.8),
        z + (rand() - 0.5),
      );
      m.scale.set(0.7, 1.8, 0.7);
      m.rotation.z = (rand() - 0.5) * 1.5;
      m.castShadow = true;
      props.add(m);
    }
  }
  for (const [x, z] of [
    [-26, -19],
    [26, -20],
    [-8, 14],
    [8, 14],
    [-26, 23],
    [25, 24],
    [-7, -9],
    [7, -16],
    [-11, -20],
    [12, -20],
  ])
    plant(x, z, true);
  for (let i = 0; i < 65; i++) {
    const m = new T.Mesh(
      new T.IcosahedronGeometry(0.18 + rand() * 0.2, 0),
      mat(i % 3 ? '#55745b' : '#bd7182'),
    );
    m.position.set(-24.06, 5 + rand() * 3, 3 + rand() * 8);
    props.add(m);
  }
  // Warm lanterns and inset wooden doors.
  for (const x of [-16, 16]) {
    box(x, 3.4, 13.1, 4.9, 0.25, 0.3, '#c2a27c');
    const l = new T.Mesh(
      new T.BoxGeometry(0.3, 0.45, 0.25),
      new T.MeshStandardMaterial({ color: '#ffda9c', emissive: '#ffbc66', emissiveIntensity: 0.6 }),
    );
    l.position.set(x + 1.7, 2.8, 13.2);
    props.add(l);
  }
  // Distant skyline gives the arena a place in the world.
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2,
      r = 45 + rand() * 14,
      h = 8 + rand() * 13;
    box(
      Math.cos(a) * r,
      h / 2 - 1,
      Math.sin(a) * r,
      6 + rand() * 6,
      h,
      6 + rand() * 7,
      i % 2 ? '#bdafa0' : '#b9b6a9',
    );
  }
  for (const side of [-1, 1]) {
    const text = side < 0 ? 'A' : 'B';
    label(text + ' · ' + (side < 0 ? 'JARDIM' : 'OFICINAS'), side * 30, 2.4, 19, '#f3e4bc', 70);
    label(
      text + ' · ' + (side < 0 ? 'GALERIA' : 'MERCADO'),
      side * 16,
      2.9,
      0.55,
      '#f0dcaa',
      60,
      Math.PI,
    );
    label(side < 0 ? '← A · ROTAÇÃO' : 'ROTAÇÃO · B →', side * 8, 2.6, -18.4, '#d8e8d5', 65);
    for (const z of [-14, -6]) box(side * 26, 0.028, z, 1.6, 0.025, 0.22, '#e3d299');
  }
  // New covered connectors join the outer flanks to the market interiors.
  for (const side of [-1, 1]) {
    for (const z of [3.8, 10.2])
      box(side * 25.1, 1.7, z, 5.8, 3.4, 0.45, side < 0 ? '#bdad93' : '#b1bcb3', true);
    box(side * 25.1, 3.55, 7, 5.8, 0.24, 6.8, '#d8c8a8', true);
    label(
      side < 0 ? 'TÚNEL A' : 'TÚNEL B',
      side * 28.07,
      2.7,
      7,
      '#f2deb1',
      65,
      (side * Math.PI) / 2,
    );
    for (const x of [side * 27.7, side * 22.5]) {
      box(x, 1.65, 3.55, 0.26, 3.3, 0.26, '#d6c4a4');
      box(x, 1.65, 10.45, 0.26, 3.3, 0.26, '#d6c4a4');
    }
  }
  decorateMap({ props, box, cylinder, label, mat, plant });
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
    cols = 33,
    rows = 35;
  const index = (x, z) => {
    const gx = Math.max(0, Math.min(cols - 1, Math.round((x + 32) / grid)));
    const gz = Math.max(0, Math.min(rows - 1, Math.round((z + 34) / grid)));
    return gz * cols + gx;
  };
  const point = (i) => ({ x: (i % cols) * grid - 32, z: Math.floor(i / cols) * grid - 34 });
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
    for (const z of [18, -19]) {
      const material = new T.MeshStandardMaterial({
        color: '#70dfea',
        emissive: '#3aa4b8',
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.2,
        side: T.DoubleSide,
        depthWrite: false,
      });
      const wall = new T.Mesh(new T.BoxGeometry(64, 4.8, 0.24), material);
      wall.position.set(0, 2.4, z);
      scene.add(wall);
      wall.updateMatrixWorld(true);
      obstacles.push(wall);
      buyObjects.push(wall);
      const block = { x: 0, z, w: 64, d: 0.24, h: 4.8, bottom: 0, buy: true };
      BLOCKS.push(block);
      buyBlocks.push(block);
      const points = [];
      for (let x = -32; x <= 32; x += 2) {
        points.push(new T.Vector3(x, 0, z), new T.Vector3(x, 4.8, z));
      }
      for (let y = 0; y <= 4.8; y += 0.6) {
        points.push(new T.Vector3(-32, y, z), new T.Vector3(32, y, z));
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
    return Math.abs(p.x) < 32 && (attacking ? p.z > 18.5 : p.z < -19.5);
  }
  function animateBuy(time) {
    for (const obj of buyObjects)
      if (obj.isMesh) obj.material.opacity = 0.17 + Math.sin(time * 2) * 0.035;
  }
  function zone(p) {
    if (p.z > 18) return 'PRAÇA DOS ATACANTES';
    if (p.z < -23) return 'BASE DEFENSORA';
    if (p.x < -25) return 'JARDIM OESTE';
    if (p.x > 25) return 'OFICINAS';
    if (p.z > 1 && p.z < 13 && p.x < -8) return 'CASA DAS FLORES';
    if (p.z > 1 && p.z < 13 && p.x > 8) return 'MERCADO DO SOL';
    if (Math.abs(p.x) < 4 && p.z < -8 && p.z > -18) return 'ARQUIVO';
    if (p.x < -9) return 'CONEXÃO A';
    if (p.x > 9) return 'CONEXÃO B';
    return 'ALAMEDA CENTRAL';
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
