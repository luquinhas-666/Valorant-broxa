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
  scene.fog = new T.Fog('#cbd9d4', 60, 155);
}

export function batchStatics(props) {
  props.updateMatrixWorld(true);
  const localInverse = new T.Matrix4().copy(props.matrixWorld).invert();
  const buckets = new Map();
  for (const m of [...props.children]) {
    if (!m.isMesh || !m.visible || m.material.transparent) continue;
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
