import * as T from './vendor/three.module.js';

// Bevelled, individually assembled first-person models; no downloaded game assets.
export function createWeaponModel(id, w, agentColor) {
  const group = new T.Group();
  group.rotation.y = 0.25;
  const metal = new T.MeshStandardMaterial({ color: '#485b68', roughness: 0.34, metalness: 0.68 });
  const upper = new T.MeshStandardMaterial({
    color: id === 'guardian' ? '#b4a887' : '#71848b',
    roughness: 0.35,
    metalness: 0.58,
  });
  const rubber = new T.MeshStandardMaterial({ color: '#202d38', roughness: 0.83, metalness: 0.08 });
  const detail = new T.MeshStandardMaterial({ color: '#aabfc2', roughness: 0.3, metalness: 0.75 });
  const accent = new T.MeshStandardMaterial({
    color: agentColor,
    emissive: agentColor,
    emissiveIntensity: 0.18,
    roughness: 0.4,
    metalness: 0.3,
  });
  const glove = new T.MeshStandardMaterial({ color: '#374854', roughness: 0.9 });
  const fabric = new T.MeshStandardMaterial({ color: '#5a717b', roughness: 0.98 });
  function mesh(geo, x, y, z, mat = metal) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
    return m;
  }
  function shape(points, depth, x, y, z, mat = metal, bevel = 0.006) {
    const s = new T.Shape();
    s.moveTo(...points[0]);
    for (const p of points.slice(1)) s.lineTo(...p);
    s.closePath();
    const geo = new T.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 5,
    });
    geo.translate(0, 0, -depth / 2);
    return mesh(geo, x, y, z, mat);
  }
  function box(x, y, z, ww, h, d, mat = metal, b = 0.006) {
    return shape(
      [
        [-ww / 2 + b, -h / 2],
        [ww / 2 - b, -h / 2],
        [ww / 2, -h / 2 + b],
        [ww / 2, h / 2 - b],
        [ww / 2 - b, h / 2],
        [-ww / 2 + b, h / 2],
        [-ww / 2, h / 2 - b],
        [-ww / 2, -h / 2 + b],
      ],
      d,
      x,
      y,
      z,
      mat,
      Math.min(b, 0.004),
    );
  }
  function cyl(x, y, z, r, l, mat = metal, sides = 16) {
    const m = mesh(new T.CylinderGeometry(r, r, l, sides), x, y, z, mat);
    m.rotation.x = Math.PI / 2;
    return m;
  }
  function cap(x, y, z, r, length, mat = glove) {
    return mesh(new T.CapsuleGeometry(r, length, 4, 10), x, y, z, mat);
  }
  const side = w.slot === 2,
    heavy = w.family === 'heavy',
    shot = !!w.pellets,
    scope = !!w.scope;
  let muzzle = -w.length * 0.76;
  if (id === 'knife') {
    const blade = shape(
      [
        [-0.033, -0.03],
        [0.035, -0.03],
        [0.05, 0.24],
        [0, 0.39],
        [-0.047, 0.24],
      ],
      0.012,
      0,
      0.03,
      -0.15,
      detail,
      0.002,
    );
    blade.rotation.x = -Math.PI / 2;
    box(0, -0.01, 0.1, 0.065, 0.06, 0.22, rubber);
    box(0, -0.01, -0.02, 0.19, 0.025, 0.045, upper);
    muzzle = -0.55;
  } else if (side) {
    const slideLength = id === 'frenzy' ? 0.25 : id === 'shorty' ? 0.38 : 0.34;
    box(0, 0.035, -0.08, 0.112, 0.105, slideLength, upper, 0.012);
    box(0, -0.031, -0.06, 0.1, 0.055, slideLength - 0.02, metal, 0.009);
    const grip = box(0, -0.115, 0.05, 0.085, 0.2, 0.11, rubber, 0.012);
    grip.rotation.x = -0.27;
    box(0, -0.223, 0.075, 0.103, 0.035, 0.11, upper);
    for (let i = 0; i < 6; i++)
      box(0.059, 0.04, 0.025 - i * 0.017, 0.004, 0.058, 0.007, rubber, 0.001);
    if (id === 'revolver') {
      const drum = mesh(new T.CylinderGeometry(0.07, 0.07, 0.1, 12), 0, -0.01, -0.055, metal);
      drum.rotation.z = Math.PI / 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        cyl(Math.sin(a) * 0.048, -0.01 + Math.cos(a) * 0.048, -0.115, 0.014, 0.015, rubber, 8);
      }
      muzzle = -0.42;
    }
    if (id === 'shorty') {
      cyl(-0.034, 0.02, -0.26, 0.032, 0.33, upper);
      cyl(0.034, 0.02, -0.26, 0.032, 0.33, upper);
      muzzle = -0.44;
    } else cyl(0, 0.04, muzzle + 0.075, 0.022, 0.15, metal);
    if (w.silenced) {
      cyl(0, 0.04, muzzle - 0.05, 0.033, 0.23, rubber);
      muzzle -= 0.165;
    }
    box(0, 0.109, -0.19, 0.018, 0.032, 0.032, rubber);
    box(0, 0.1, 0.07, 0.065, 0.025, 0.025, rubber);
    box(0, 0.114, -0.19, 0.009, 0.007, 0.011, accent, 0.001);
  } else {
    const body = shape(
      [
        [-0.065, -0.06],
        [0.064, -0.06],
        [0.08, -0.025],
        [0.061, 0.08],
        [-0.052, 0.085],
        [-0.072, 0.035],
      ],
      0.36,
      0,
      0.015,
      -0.03,
      metal,
      0.01,
    );
    box(0, 0.106, -0.07, 0.095, 0.035, 0.46, upper, 0.005);
    box(0, -0.045, -0.34, heavy ? 0.18 : 0.12, 0.11, 0.25, metal, 0.012);
    const stock = shape(
      [
        [-0.065, -0.07],
        [0.065, -0.07],
        [0.07, 0.05],
        [0.03, 0.08],
        [-0.06, 0.06],
      ],
      0.27,
      0,
      -0.015,
      0.29,
      rubber,
      0.009,
    );
    box(0, -0.016, 0.45, 0.14, 0.18, 0.045, upper, 0.012);
    box(0, -0.01, 0.16, 0.075, 0.07, 0.15, metal);
    const grip = box(0.012, -0.12, 0.04, 0.083, 0.2, 0.11, rubber, 0.008);
    grip.rotation.x = -0.3;
    if (heavy) {
      box(0, -0.16, -0.1, 0.19, 0.22, 0.22, rubber, 0.015);
      for (let i = 0; i < 6; i++)
        cyl(
          0.11,
          -0.05,
          -0.2 + i * 0.027,
          0.012,
          0.022,
          new T.MeshStandardMaterial({ color: '#b3a172', metalness: 0.6, roughness: 0.4 }),
          8,
        );
    } else if (shot) {
      if (id === 'judge') cyl(0, -0.13, -0.13, 0.1, 0.17, rubber);
      else {
        cyl(0, -0.045, -0.4, 0.035, 0.42, rubber);
        box(0, -0.05, -0.4, 0.105, 0.075, 0.19, upper, 0.01);
      }
    } else {
      const mag = box(0, -0.17, -0.12, 0.082, 0.24, 0.14, rubber, 0.008);
      mag.rotation.x = id === 'bulldog' ? -0.2 : 0.19;
      for (let i = 0; i < 3; i++)
        box(0.044, -0.12 - i * 0.055, -0.12, 0.005, 0.008, 0.13, upper, 0.001);
    }
    const handguardLength = Math.max(0.18, w.length * 0.55);
    box(0, 0.025, -0.29 - handguardLength / 2, 0.115, 0.115, handguardLength, upper, 0.009);
    for (let i = 0; i < 7; i++) {
      const z = -0.23 - (i * handguardLength) / 7;
      box(0.064, 0.028, z, 0.008, 0.036, 0.024, rubber, 0.002);
      box(0, 0.103, z, 0.13, 0.018, 0.018, rubber, 0.001);
    }
    cyl(0, 0.045, muzzle + 0.06, 0.022, 0.25, metal);
    cyl(0, 0.045, muzzle - 0.045, 0.031, 0.09, rubber);
    muzzle -= 0.09;
    if (w.silenced) {
      cyl(0, 0.045, muzzle - 0.09, 0.042, 0.24, rubber);
      for (let i = 0; i < 4; i++) cyl(0, 0.045, muzzle - 0.18 + i * 0.04, 0.043, 0.006, metal);
      muzzle -= 0.22;
    }
    box(0.078, 0.022, 0.025, 0.008, 0.05, 0.105, rubber, 0.002);
    box(0.087, 0.024, 0.016, 0.006, 0.023, 0.071, detail, 0.001);
    cyl(0.086, 0.06, 0.08, 0.01, 0.04, detail, 8);
    box(0, 0.145, -0.34, 0.026, 0.069, 0.028, rubber);
    box(0, 0.127, 0.055, 0.08, 0.03, 0.039, rubber);
    box(0, 0.184, -0.34, 0.012, 0.008, 0.012, accent, 0.001);
    if (scope) {
      cyl(0, 0.205, -0.15, 0.058, 0.34, rubber, 20);
      cyl(0, 0.205, -0.34, 0.073, 0.07, metal, 20);
      cyl(0, 0.205, 0.02, 0.069, 0.045, upper, 20);
      cyl(0, 0.205, 0.045, 0.05, 0.006, new T.MeshBasicMaterial({ color: '#7eaeb0' }), 20);
      box(0, 0.148, -0.14, 0.06, 0.075, 0.2, metal);
      const knob = mesh(new T.CylinderGeometry(0.03, 0.03, 0.045, 12), 0.065, 0.205, -0.13, rubber);
      knob.rotation.z = Math.PI / 2;
    }
    if (id === 'bulldog') {
      box(0, 0.18, -0.03, 0.11, 0.07, 0.13, rubber, 0.01);
      box(0, 0.18, -0.1, 0.07, 0.039, 0.008, accent, 0.002);
    }
    // Supporting hand is rounded and follows the fore-end.
    const hand = cap(-0.085, -0.08, -0.36, 0.049, 0.09);
    hand.rotation.z = 0.9;
    const wrist = cap(-0.17, -0.15, -0.24, 0.053, 0.2, fabric);
    wrist.rotation.set(-0.6, 0, -0.7);
    for (let i = 0; i < 4; i++) {
      const f = cap(-0.075 + i * 0.023, -0.074, -0.39, 0.012, 0.055, glove);
      f.rotation.x = 1.2;
    }
  }
  // Trigger guard and articulated right hand, with a sleeve extending below frame.
  const guard = mesh(
    new T.TorusGeometry(0.053, 0.008, 6, 14, Math.PI * 1.5),
    0,
    -0.085,
    -0.045,
    rubber,
  );
  guard.rotation.y = Math.PI / 2;
  const hand = cap(0.012, -0.13, 0.12, 0.051, 0.065);
  hand.rotation.x = 0.35;
  for (let i = 0; i < 3; i++) {
    const finger = cap(0.055, -0.105 - i * 0.026, 0.065, 0.014, 0.047);
    finger.rotation.x = 1.3;
  }
  const sleeve = cap(0.055, -0.255, 0.255, 0.075, 0.29, fabric);
  sleeve.rotation.x = -0.6;
  sleeve.rotation.z = 0.12;
  box(0.077, -0.22, 0.17, 0.018, 0.08, 0.08, rubber);
  box(0.09, -0.22, 0.17, 0.006, 0.032, 0.05, accent, 0.001);
  for (let i = 0; i < 2; i++)
    box(0.073, 0.022 - i * 0.018, -0.005, 0.004, 0.008, 0.065, accent, 0.001);
  return { group, muzzle: new T.Vector3(0, 0.04, muzzle) };
}
