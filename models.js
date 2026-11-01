import * as T from './vendor/three.module.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from './vendor/utils/SkeletonUtils.js';
import { LOOKS } from './data.js';

const names = [
  'Character_Soldier',
  'Character_Enemy',
  'Character_Hazmat',
  'AK',
  'Pistol',
  'Revolver',
  'SMG',
  'Shotgun',
  'Sniper',
  'Sniper_2',
  'Knife_1',
];
const templates = new Map();
const skins = {
  vex: 'Character_Soldier',
  sol: 'Character_Soldier',
  echo: 'Character_Enemy',
  aegis: 'Character_Hazmat',
  nyx: 'Character_Enemy',
  kite: 'Character_Soldier',
  meda: 'Character_Hazmat',
  rook: 'Character_Enemy',
};
const heldNames = [
  'AK',
  'GrenadeLauncher',
  'Knife_1',
  'Knife_2',
  'Pistol',
  'Revolver',
  'Revolver_Small',
  'RocketLauncher',
  'ShortCannon',
  'Shotgun',
  'Shovel',
  'SMG',
  'Sniper',
  'Sniper_2',
];
export function weaponAsset(id) {
  if (id === 'knife') return 'Knife_1';
  if (['revolver'].includes(id)) return 'Revolver';
  if (['pulse', 'whisper', 'frenzy'].includes(id)) return 'Pistol';
  if (['shorty', 'nova', 'judge'].includes(id)) return 'Shotgun';
  if (['stinger', 'ghost'].includes(id)) return 'SMG';
  if (id === 'operator') return 'Sniper_2';
  if (id === 'scout') return 'Sniper';
  return 'AK';
}
export async function loadModelAssets(read = null) {
  // No model downloads are needed by the authoritative collision simulation.
  if (!read && typeof fetch === 'undefined') return { loaded: 0, failed: [] };
  const loader = new GLTFLoader();
  const results = await Promise.allSettled(
    names.map(async (name) => {
      const url = new URL(`./assets/models/${name}.glb`, import.meta.url);
      let bytes;
      if (read) bytes = await read(url);
      else {
        const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
        if (!res.ok) throw Error(`${name}: ${res.status}`);
        bytes = await res.arrayBuffer();
      }
      templates.set(name, await loader.parseAsync(bytes, ''));
      return name;
    }),
  );
  return {
    loaded: templates.size,
    failed: results.flatMap((r, i) => (r.status === 'rejected' ? [names[i]] : [])),
  };
}
function copyModel(name) {
  const template = templates.get(name);
  if (!template) return null;
  const root = cloneSkeleton(template.scene),
    materials = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry = o.geometry.clone();
    const copy = (m) => {
      if (!materials.has(m)) materials.set(m, m.clone());
      return materials.get(m);
    };
    o.material = Array.isArray(o.material) ? o.material.map(copy) : copy(o.material);
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
  });
  return { root, clips: template.animations };
}
function boundsVisible(root) {
  root.updateMatrixWorld(true);
  const box = new T.Box3();
  root.traverseVisible((o) => {
    if (o.isMesh) box.union(new T.Box3().setFromObject(o));
  });
  return box;
}
function colorCharacter(root, color, identity) {
  const done = new Set();
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (done.has(m)) continue;
      done.add(m);
      m.roughness = 0.72;
      m.metalness = 0.08;
      if (/Character_Main|Enemy_Red|Suit|Hazmat/i.test(m.name))
        m.color.set(identity === 'meda' ? '#d9e4de' : color);
      else if (/Pants/i.test(m.name)) m.color.set(color).multiplyScalar(0.38);
      else if (m.name === 'Skin' && LOOKS[identity]) m.color.set(LOOKS[identity].skin);
    }
  });
}
export function createImportedSoldier(color, enemy, identity) {
  const data = copyModel(skins[identity] || 'Character_Soldier');
  if (!data) return null;
  const { root, clips } = data,
    group = new T.Group(),
    targets = [],
    mixer = new T.AnimationMixer(root);
  let current = null,
    lastClip = '',
    dead = false,
    gunId = 'AK';
  const weapons = new Map(heldNames.map((name) => [name, root.getObjectByName(name)]));
  function showWeapon() {
    for (const [name, obj] of weapons) if (obj) obj.visible = name === gunId;
  }
  function play(name) {
    if (name === lastClip) return;
    const clip = clips.find((c) => c.name === name) || clips.find((c) => c.name === 'Idle');
    if (!clip) return;
    const action = mixer.clipAction(clip);
    action.reset();
    if (name === 'Death') {
      action.setLoop(T.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    action.play();
    if (current) current.fadeOut(0.13);
    action.fadeIn(0.13);
    current = action;
    lastClip = name;
  }
  colorCharacter(root, color, identity);
  play('Idle');
  mixer.update(0.2);
  showWeapon();
  // Fit body/head, excluding held props, to the game's unchanged two-metre hitbox rig.
  for (const obj of weapons.values()) if (obj) obj.visible = false;
  const bb = boundsVisible(root),
    height = bb.max.y - bb.min.y;
  const visual = new T.Group();
  visual.scale.setScalar(1.98 / height);
  root.position.y -= bb.min.y;
  visual.rotation.y = Math.PI;
  visual.add(root);
  group.add(visual);
  showWeapon();
  const hitMat = new T.MeshBasicMaterial({ visible: false });
  function hit(geo, x, y, z, head = false) {
    const m = new T.Mesh(geo, hitMat);
    m.position.set(x, y, z);
    m.visible = false;
    m.userData.head = head;
    targets.push(m);
    group.add(m);
  }
  hit(new T.SphereGeometry(0.205, 12, 10), 0, 1.81, 0, true);
  hit(new T.CapsuleGeometry(0.25, 0.38, 3, 8), 0, 1.23, 0);
  for (const side of [-1, 1]) {
    hit(new T.CapsuleGeometry(0.105, 0.58, 3, 8), side * 0.16, 0.49, 0);
    hit(new T.CapsuleGeometry(0.115, 0.3, 3, 8), side * 0.35, 1.22, -0.08);
  }
  const marker = enemy ? '#ff6979' : color;
  const ring = new T.Mesh(
    new T.RingGeometry(0.36, 0.43, 24),
    new T.MeshBasicMaterial({
      color: marker,
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
    new T.MeshBasicMaterial({ color: marker }),
  );
  badge.position.y = 2.3;
  group.add(badge);
  const muzzle = new T.Mesh(
    new T.OctahedronGeometry(0.095),
    new T.MeshBasicMaterial({ color: '#ffd598', transparent: true, opacity: 0.85 }),
  );
  muzzle.position.set(0.18, 1.35, -0.95);
  muzzle.visible = false;
  group.add(muzzle);
  return {
    group,
    targets,
    badge,
    muzzle,
    imported: true,
    asset: skins[identity],
    mixer,
    visual,
    setWeapon(id) {
      gunId = weaponAsset(id);
      showWeapon();
    },
    setAlive(value) {
      dead = !value;
      play(dead ? 'Death' : 'Idle');
    },
    animate(walking, time, aiming = false, dt = 1 / 60) {
      play(dead ? 'Death' : walking ? 'Run_Gun' : aiming ? 'Idle_Shoot' : 'Idle');
      mixer.update(Math.min(dt, 0.08));
      showWeapon();
      badge.position.y = 2.3 + Math.sin(time * 0.5) * 0.025;
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}
export function createImportedWeapon(id, w, color) {
  const asset = weaponAsset(id),
    data = copyModel(asset);
  if (!data) return null;
  const group = new T.Group(),
    root = data.root;
  if (id === 'knife') root.rotation.x = -Math.PI / 2;
  else root.rotation.y = -Math.PI / 2;
  root.updateMatrixWorld(true);
  let bb = new T.Box3().setFromObject(root);
  const length =
    id === 'knife'
      ? 0.57
      : w.slot === 2
        ? id === 'shorty'
          ? 0.55
          : 0.44
        : w.scope
          ? 1.12
          : w.family === 'heavy'
            ? 1.12
            : Math.min(1.12, Math.max(0.72, w.length * 1.06));
  root.scale.multiplyScalar(length / (bb.max.z - bb.min.z));
  root.updateMatrixWorld(true);
  bb = new T.Box3().setFromObject(root);
  root.position.set(
    -(bb.min.x + bb.max.x) / 2,
    -(bb.min.y + bb.max.y) / 2 + 0.015,
    0.18 - bb.max.z,
  );
  root.updateMatrixWorld(true);
  bb = new T.Box3().setFromObject(root);
  group.add(root);
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        m.roughness = 0.43;
        m.metalness = 0.32;
        if (/Wood/i.test(m.name)) m.color.set(color).lerp(new T.Color('#273742'), 0.72);
      }
    }
  });
  function mesh(geo, x, y, z, material) {
    const m = new T.Mesh(geo, material);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  }
  const glove = new T.MeshStandardMaterial({ color: '#293e4b', roughness: 0.85 }),
    fabric = new T.MeshStandardMaterial({ color: '#49616d', roughness: 1 });
  if (w.family === 'heavy' || id === 'judge') {
    const drum = mesh(
      new T.CylinderGeometry(0.085, 0.085, 0.13, 16),
      0,
      -0.14,
      -0.15,
      new T.MeshStandardMaterial({ color: '#344953', roughness: 0.5, metalness: 0.4 }),
    );
    drum.rotation.z = Math.PI / 2;
  }
  if (id === 'frenzy')
    mesh(
      new T.BoxGeometry(0.06, 0.12, 0.07),
      0,
      -0.2,
      0.02,
      new T.MeshStandardMaterial({ color: '#344953', metalness: 0.3, roughness: 0.5 }),
    );
  const hand = mesh(new T.CapsuleGeometry(0.052, 0.08, 4, 10), 0.015, -0.14, 0.09, glove);
  hand.rotation.x = 0.3;
  const sleeve = mesh(new T.CapsuleGeometry(0.07, 0.29, 4, 10), 0.06, -0.29, 0.24, fabric);
  sleeve.rotation.x = -0.6;
  for (let i = 0; i < 3; i++)
    mesh(
      new T.CapsuleGeometry(0.013, 0.045, 3, 8),
      0.054,
      -0.1 - i * 0.025,
      0.055,
      glove,
    ).rotation.x = 1.3;
  if (w.slot === 1) {
    const support = mesh(new T.CapsuleGeometry(0.049, 0.1, 4, 10), -0.07, -0.1, -0.31, glove);
    support.rotation.z = 0.8;
    mesh(new T.CapsuleGeometry(0.055, 0.22, 4, 10), -0.16, -0.2, -0.18, fabric).rotation.z = -0.65;
  }
  let tip = bb.min.z;
  if (w.silenced) {
    const silencer = mesh(
      new T.CylinderGeometry(0.029, 0.029, 0.18, 16),
      0,
      0.07,
      tip - 0.06,
      new T.MeshStandardMaterial({ color: '#263944', metalness: 0.5, roughness: 0.4 }),
    );
    silencer.rotation.x = Math.PI / 2;
    tip -= 0.15;
  }
  group.rotation.y = 0.12;
  return { group, muzzle: new T.Vector3(0, 0.07, tip), imported: true, asset };
}
