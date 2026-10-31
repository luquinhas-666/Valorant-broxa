import * as T from './vendor/three.module.js';

export function upgradeLighting(scene) {
  const sky = document.createElement('canvas');
  sky.width = 32;
  sky.height = 256;
  const c = sky.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#709ebc');
  g.addColorStop(0.62, '#b8d9df');
  g.addColorStop(1, '#eee3c9');
  c.fillStyle = g;
  c.fillRect(0, 0, 32, 256);
  scene.background = new T.CanvasTexture(sky);
  scene.background.colorSpace = T.SRGBColorSpace;
  const faces = [];
  for (let i = 0; i < 6; i++) {
    const can = document.createElement('canvas');
    can.width = can.height = 64;
    const ctx = can.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, i === 3 ? '#b6a388' : '#d8f2ff');
    gradient.addColorStop(0.5, '#c2d5d8');
    gradient.addColorStop(1, '#8d8474');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    faces.push(can);
  }
  scene.environment = new T.CubeTexture(faces);
  scene.environment.colorSpace = T.SRGBColorSpace;
  scene.environment.needsUpdate = true;
  scene.environmentIntensity = 0.55;
  scene.fog = new T.Fog('#cbd9d4', 45, 125);
}

export function decorateMap({ props, box, cylinder, label, mat, plant }) {
  const trim = '#d6c8ad',
    base = '#a89d88',
    iron = '#344f55',
    wood = '#79634c';
  const shadeCanvas = document.createElement('canvas');
  shadeCanvas.width = shadeCanvas.height = 128;
  const sc = shadeCanvas.getContext('2d');
  const gradient = sc.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(28,36,38,.44)');
  gradient.addColorStop(0.65, 'rgba(28,36,38,.18)');
  gradient.addColorStop(1, 'rgba(28,36,38,0)');
  sc.fillStyle = gradient;
  sc.fillRect(0, 0, 128, 128);
  const shadeMat = new T.MeshBasicMaterial({
    map: new T.CanvasTexture(shadeCanvas),
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  function shade(x, z, w, d) {
    const mesh = new T.Mesh(new T.PlaneGeometry(w, d), shadeMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.018, z);
    props.add(mesh);
  }
  function paving(x, z, w, d, color) {
    const m = box(x, 0.012, z, w, 0.018, d, color);
    m.castShadow = false;
    return m;
  }
  // Pale stone paving borders the central boulevard and the two outer alleys.
  for (const x of [-6.8, 6.8, -27.7, 27.7])
    for (let z = -29; z < 29; z += 2.1) {
      paving(x, z, 0.25, 1.95, '#ded7bc');
    }
  for (const z of [-19.5, 16.8])
    for (let x = -27; x <= 27; x += 1.7) paving(x, z, 1.55, 0.26, '#e1d5b5');
  for (const [x, z, w, d, h] of [
    [-16, 7, 16, 12, 8.5],
    [16, 7, 16, 12, 7],
    [0, -13, 8, 9, 6],
    [-17, -24, 14, 7, 9],
    [17, -24, 14, 7, 8],
  ]) {
    shade(x, z, w + 4, d + 4);
    // Corner pilasters, layered cornices and a plinth break up the old flat boxes.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        box(x + sx * (w / 2 + 0.22), h / 2, z + sz * (d / 2 + 0.22), 0.35, h + 0.1, 0.35, trim);
        box(x + sx * (w / 2 + 0.22), 0.28, z + sz * (d / 2 + 0.22), 0.5, 0.55, 0.5, base);
        box(x + sx * (w / 2 + 0.22), h - 0.3, z + sz * (d / 2 + 0.22), 0.55, 0.22, 0.55, trim);
      }
    box(x, h - 0.15, z, w + 0.6, 0.15, d + 0.6, '#aa8d70');
    box(x, h + 0.05, z, w + 0.85, 0.13, d + 0.85, trim);
    box(x, h + 0.27, z, w + 0.45, 0.1, d + 0.45, '#e6d5b9');
    for (const sz of [-1, 1]) {
      const face = z + sz * (d / 2 + 0.35);
      box(x, 3.13, face, w, 0.09, 0.11, trim);
      for (let dx = -w / 2 + 2; dx < w / 2 - 1; dx += 3.6) {
        for (const side of [-1, 1]) {
          box(x + dx + side * 0.75, 4.45, face, 0.25, 1.95, 0.18, iron);
          for (let n = 0; n < 7; n++)
            box(
              x + dx + side * 0.75,
              3.65 + n * 0.24,
              face + sz * 0.1,
              0.24,
              0.05,
              0.05,
              '#72928e',
            );
        }
        box(x + dx, 5.45, face, 1.82, 0.19, 0.34, trim);
        box(x + dx, 3.38, face + sz * 0.13, 1.9, 0.16, 0.5, trim);
        box(x + dx, 3.57, face + sz * 0.2, 1.55, 0.22, 0.35, '#696a50');
        for (let n = 0; n < 5; n++) {
          const leaf = new T.Mesh(
            new T.IcosahedronGeometry(0.16, 0),
            mat(n % 2 ? '#729c66' : '#d89097'),
          );
          leaf.position.set(x + dx - 0.6 + n * 0.3, 3.8, face + sz * 0.26);
          props.add(leaf);
        }
      }
    }
    // Side-facing windows also give flank corridors recognizable landmarks.
    for (const sx of [-1, 1])
      for (let dz = -d / 2 + 2; dz < d / 2; dz += 4) {
        const wall = x + sx * (w / 2 + 0.31);
        box(wall, 4.5, z + dz, 0.1, 1.7, 1.2, iron);
        box(wall + sx * 0.08, 4.5, z + dz, 0.08, 0.08, 1.3, trim);
        box(wall, 5.42, z + dz, 0.35, 0.15, 1.55, trim);
        box(wall + sx * 0.08, 3.56, z + dz, 0.38, 0.18, 1.6, trim);
      }
  }
  // Interior market halls: tiled floors, high wooden beams, lamps and counters.
  for (const x of [-16, 16]) {
    paving(x, 7, 15, 11, x < 0 ? '#baa998' : '#9eafa9');
    for (let z = 3; z < 13; z += 2) {
      box(x, 5.5, z, 15, 0.2, 0.2, wood);
      box(x - 5.8, 2.5, z, 0.18, 5, 0.18, wood);
      box(x + 5.8, 2.5, z, 0.18, 5, 0.18, wood);
    }
    for (const dx of [-5.2, 5.2]) {
      box(x + dx, 0.65, 6, 2.2, 1.3, 2, wood, true);
      box(x + dx, 1.35, 6, 2.4, 0.12, 2.1, '#d5b887');
      shade(x + dx, 6, 4, 3);
      for (let i = 0; i < 3; i++)
        cylinder(x + dx - 0.6 + i * 0.6, 1.63, 6, 0.18, 0.16, 0.45, i % 2 ? '#bf855e' : '#8da182');
    }
    for (const z of [4, 10]) {
      cylinder(x, 4.9, z, 0.028, 0.028, 1.3, iron, 6);
      const lamp = new T.Mesh(new T.CylinderGeometry(0.34, 0.52, 0.23, 12), mat(iron));
      lamp.position.set(x, 4.25, z);
      props.add(lamp);
      box(
        x,
        4.16,
        z,
        0.32,
        0.04,
        0.32,
        new T.MeshStandardMaterial({ color: '#ffe6ad', emissive: '#ffc471', emissiveIntensity: 1 }),
      );
    }
    label(x < 0 ? 'CASA DAS FLORES' : 'MERCADO DO SOL', x, 3.7, 13.38, '#f0dfb8', 60);
    label(x < 0 ? 'GALERIA' : 'PASSAGEM', x, 3.7, 0.58, '#e9d5ac', 75, Math.PI);
  }
  // A dark central arcade links the two sites instead of a solid center building.
  paving(0, -13, 7, 8, '#9b9d92');
  for (const x of [-3.65, 3.65]) {
    box(x, 1.9, -13, 0.13, 3.8, 8, '#a69e8b');
    box(x, 3.8, -13, 0.3, 0.18, 8.5, trim);
  }
  label('ARQUIVO', 0, 3.6, -8.08, '#708c88', 75);
  label('MEIO', 0, 3.5, -17.92, '#718582', 90, Math.PI);
  // Outer flank routes: a garden arcade west and a service lane east.
  for (const side of [-1, 1]) {
    for (const z of [-22, -13, -4, 5, 14, 23]) {
      cylinder(side * 31, 2.1, z, 0.18, 0.23, 4.2, trim, 10);
      box(side * 31, 4.3, z, 0.7, 0.2, 0.7, trim);
      box(side * 31, 4.6, z, 1, 0.15, 8.8, wood);
      shade(side * 31, z, 2, 2);
    }
    for (const z of [-8, 17]) {
      box(side * 31, 1.5, z, 1.8, 3, 3, side < 0 ? '#88987c' : '#708e95', true);
      box(side * 30.08, 1.8, z, 0.05, 1.3, 2.3, iron);
      for (let i = 0; i < 6; i++) box(side * 30.02, 1.3 + i * 0.2, z, 0.05, 0.055, 2.2, '#a9b7a9');
    }
    plant(side * 30, -27, true);
    plant(side * 30, 27, true);
  }
  label('JARDIM', -32, 3, 10, '#e6d8ba', 90, Math.PI / 2);
  label('OFICINAS', 32, 3, 8, '#e6d8ba', 90, -Math.PI / 2);
  // Decorative balconies sit above playable routes; their floors aren't advertised as walkable.
  for (const x of [-16, 16]) {
    box(x, 5.9, 13.6, 4.2, 0.22, 1.4, trim);
    for (let i = 0; i < 11; i++) box(x - 2 + i * 0.4, 6.45, 14.23, 0.045, 1.1, 0.045, iron);
    box(x, 7, 14.23, 4.2, 0.06, 0.06, iron);
    for (const side of [-1, 1]) box(x + side * 2, 6.45, 13.7, 0.055, 1.1, 1.1, iron);
  }
  // Utility details, benches, wall-mounted signs and drain grates.
  for (const [x, z] of [
    [-6, 19],
    [6, 17],
    [-12, -18],
    [11, -18],
  ]) {
    box(x, 0.5, z, 2.4, 0.13, 0.72, wood);
    box(x, 0.9, z + 0.32, 2.4, 0.7, 0.12, wood);
    for (const dx of [-0.9, 0.9]) box(x + dx, 0.25, z, 0.12, 0.5, 0.55, iron);
    shade(x, z, 3.6, 2);
  }
  for (const x of [-25, 25])
    for (const z of [-16, 20]) {
      cylinder(x, 1.9, z, 0.035, 0.035, 3.8, iron, 8);
      const lamp = new T.Mesh(
        new T.SphereGeometry(0.17, 10, 8),
        new T.MeshStandardMaterial({
          color: '#ffe4b4',
          emissive: '#ffc282',
          emissiveIntensity: 0.8,
        }),
      );
      lamp.position.set(x, 3.7, z);
      props.add(lamp);
    }
  for (const x of [-7.2, 7.2])
    for (const z of [-4, 17]) {
      paving(x, z, 0.75, 1.5, iron);
      for (let i = 0; i < 7; i++) paving(x - 0.32 + i * 0.1, z, 0.035, 1.45, '#8f9991');
    }
  // Contact shadows anchor every large cover object without another rendering pass.
  for (const [x, z] of [
    [-29, 28],
    [29, 29],
    [-30, -30],
    [29, -30],
  ]) {
    cylinder(x, 2, z, 0.18, 0.28, 4, '#756c50', 8);
    for (let n = 0; n < 7; n++) {
      const a = n * 2.4;
      const leaf = new T.Mesh(
        new T.IcosahedronGeometry(1.5, 1),
        mat(n % 2 ? '#5f8c68' : '#809a6b'),
      );
      leaf.scale.set(1, 0.75, 1);
      leaf.position.set(x + Math.cos(a) * 0.85, 4.2 + (n % 3) * 0.55, z + Math.sin(a) * 0.85);
      leaf.castShadow = true;
      props.add(leaf);
    }
    shade(x, z, 5, 5);
  }
  for (const [x, z] of [
    [-3, 21],
    [7, 19],
    [-4, 0],
    [6, -3],
    [-22, -9],
    [-17, -5.5],
    [21, -12],
    [15, -7],
    [-8, -24],
    [8, -24],
  ])
    shade(x, z, 5, 5);
}

// Merge static meshes by material to keep a detailed arena affordable in the browser.
// Original colliders keep their baked world matrices for independent hit testing.
export function batchStatics(props) {
  props.updateMatrixWorld(true);
  const localInverse = new T.Matrix4().copy(props.matrixWorld).invert();
  const buckets = new Map();
  for (const m of [...props.children]) {
    if (!m.isMesh || m.material.transparent) continue;
    const key = m.material.uuid + '/' + m.castShadow + '/' + m.receiveShadow;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { material: m.material, cast: m.castShadow, receive: m.receiveShadow, list: [] };
      buckets.set(key, bucket);
    }
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    geo.applyMatrix4(new T.Matrix4().multiplyMatrices(localInverse, m.matrixWorld));
    bucket.list.push(geo);
    props.remove(m);
  }
  for (const b of buckets.values()) {
    const merged = new T.BufferGeometry();
    for (const [attr, size] of [
      ['position', 3],
      ['normal', 3],
      ['uv', 2],
    ]) {
      const count = b.list.reduce((n, g) => n + g.getAttribute('position').count, 0),
        array = new Float32Array(count * size);
      let offset = 0;
      for (const geo of b.list) {
        const a = geo.getAttribute(attr);
        if (a) array.set(a.array, offset);
        offset += geo.getAttribute('position').count * size;
      }
      merged.setAttribute(attr, new T.BufferAttribute(array, size));
    }
    merged.computeBoundingSphere();
    const mesh = new T.Mesh(merged, b.material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    props.add(mesh);
    b.list.forEach((g) => g.dispose());
  }
}
