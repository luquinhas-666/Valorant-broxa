import * as T from './vendor/three.module.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
const models = new Map(),
  textures = new Map(),
  materials = new Map();
export const ENVIRONMENT_MODELS = [
  'Crate',
  'Container_Small',
  'Container_Long',
  'Pallet',
  'GasTank',
  'StreetLight',
  'Tree_1',
];
const types = { paving: 'PavingStones036', concrete: 'Concrete034', plaster: 'Plaster001' };
export async function loadEnvironmentAssets(read = null) {
  if (!read && typeof fetch === 'undefined') return { loaded: 0 };
  const loader = new GLTFLoader(),
    jobs = ENVIRONMENT_MODELS.map(async (name) => {
      const url = new URL(`./assets/environment/${name}.glb`, import.meta.url);
      const bytes = read
        ? await read(url)
        : await fetch(url, { signal: AbortSignal.timeout(20000) }).then((r) => {
            if (!r.ok) throw Error(name);
            return r.arrayBuffer();
          });
      models.set(name, (await loader.parseAsync(bytes, '')).scene);
    });
  if (!read)
    for (const [kind, prefix] of Object.entries(types))
      for (const suffix of ['Color', 'NormalGL', 'Roughness'])
        jobs.push(
          (async () => {
            const t = await new T.TextureLoader().loadAsync(
              new URL(`./assets/textures/${prefix}_512-JPG_${suffix}.jpg`, import.meta.url).href,
            );
            t.wrapS = t.wrapT = T.RepeatWrapping;
            t.repeat.set(0.25, 0.25);
            t.anisotropy = 4;
            if (suffix === 'Color') t.colorSpace = T.SRGBColorSpace;
            textures.set(kind + suffix, t);
          })(),
        );
  const results = await Promise.allSettled(jobs);
  return {
    loaded: models.size,
    textures: textures.size,
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}
export function surfaceMaterial(kind, color = '#ffffff') {
  if (!textures.has(kind + 'Color')) return null;
  const key = kind + color;
  if (materials.has(key)) return materials.get(key);
  const m = new T.MeshStandardMaterial({
    color,
    map: textures.get(kind + 'Color'),
    normalMap: textures.get(kind + 'NormalGL'),
    roughnessMap: textures.get(kind + 'Roughness'),
    roughness: 0.95,
    normalScale: new T.Vector2(0.25, 0.25),
  });
  materials.set(key, m);
  return m;
}
export function textureBox(mesh, kind, color) {
  const material = surfaceMaterial(kind, color);
  if (!material) return;
  mesh.material = material;
  const g = mesh.geometry,
    p = g.attributes.position,
    n = g.attributes.normal,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + mesh.position.x,
      y = p.getY(i) + mesh.position.y,
      z = p.getZ(i) + mesh.position.z;
    uv.setXY(i, Math.abs(n.getX(i)) > 0.5 ? z : x, Math.abs(n.getY(i)) > 0.5 ? z : y);
  }
  uv.needsUpdate = true;
}
export function environmentModel(
  name,
  { x = 0, z = 0, y = 0, w = 2, d = 2, h = 2, rotation = 0 } = {},
) {
  const template = models.get(name);
  if (!template) return null;
  const root = template.clone(true),
    group = new T.Group();
  root.rotation.y = rotation;
  root.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(root),
    s = bb.getSize(new T.Vector3());
  const fit = new T.Group();
  fit.scale.set(w / s.x, h / s.y, d / s.z);
  root.position.sub(new T.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2));
  fit.add(root);
  group.add(fit);
  group.position.set(x, y, z);
  group.userData.asset = name;
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return group;
}
