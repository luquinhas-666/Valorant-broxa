import * as T from './vendor/three.module.js';

export function impactAngle(listener, source, yaw = 0) {
  if (!source) return null;
  return Math.atan2(source.x - listener.x, -(source.z - listener.z)) + yaw;
}
export class CombatFeedback {
  constructor(scene, ui = {}) {
    this.scene = scene;
    this.ui = ui;
    this.bursts = [];
    this.flashes = new Map();
    this.pulse = 0;
    this.death = null;
    this.origin = null;
    this.clock = 0;
  }
  burst(position, color, death = false) {
    if (this.bursts.length >= 24) this.removeBurst(this.bursts.shift());
    const count = death ? 28 : 10,
      coordinates = new Float32Array(count * 3),
      velocity = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996;
      velocity[i * 3] = Math.cos(angle) * (death ? 1.6 : 1.1);
      velocity[i * 3 + 1] = death ? 0.7 + (i % 7) * 0.22 : 0.3 + (i % 5) * 0.2;
      velocity[i * 3 + 2] = Math.sin(angle) * (death ? 1.6 : 1.1);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(coordinates, 3));
    const points = new T.Points(
      geometry,
      new T.PointsMaterial({
        color,
        size: death ? 0.065 : 0.045,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      }),
    );
    points.frustumCulled = false;
    points.position.set(position.x, death ? 0.7 : (position.y ?? 1.3), position.z);
    this.scene.add(points);
    let ring = null;
    if (death) {
      ring = new T.Mesh(
        new T.RingGeometry(0.25, 0.33, 32),
        new T.MeshBasicMaterial({
          color,
          side: T.DoubleSide,
          transparent: true,
          depthWrite: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(position.x, 0.045, position.z);
      this.scene.add(ring);
    }
    this.bursts.push({ points, ring, velocity, age: 0, life: death ? 0.85 : 0.28 });
  }
  impact(actor, { head = false, shielded = false } = {}) {
    const existing = this.flashes.get(actor.model);
    if (existing) {
      existing.age = 0;
      return;
    }
    const materials = new Map();
    actor.model.group.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (m.emissive && !materials.has(m))
          materials.set(m, { color: m.emissive.clone(), intensity: m.emissiveIntensity });
    });
    const color = shielded ? '#83e9ff' : '#ffbd80';
    this.flashes.set(actor.model, {
      age: 0,
      materials,
      color,
      roll: actor.model.visual?.rotation.z || 0,
    });
    this.burst({ ...actor.pos, y: head ? 1.8 : 1.25 }, color);
  }
  hurt(position, source, amount) {
    this.pulse = 0.65;
    this.power = Math.min(1, Math.max(0.25, amount / 65));
    this.origin = source ? { ...source } : null;
    this.hurtPosition = { ...position };
  }
  die(position, yaw, killer = 'AMBIENTE') {
    this.death = { age: 0, position: { ...position }, yaw };
    if (this.ui.killer) this.ui.killer.textContent = `ELIMINADO POR ${killer}`;
    this.ui.canvas?.classList.add('death-view');
  }
  eliminate(actor) {
    this.burst(actor.pos, actor.team === 0 ? '#91ddd5' : '#ff778b', true);
  }
  deathCamera(camera) {
    if (!this.death || this.death.age >= 0.85) return false;
    const d = this.death,
      t = Math.min(1, d.age / 0.85),
      ease = 1 - (1 - t) ** 3;
    camera.position.set(
      d.position.x,
      (d.position.y || 0) + 0.45 + 1.25 * (1 - ease),
      d.position.z + 0.18 * ease,
    );
    camera.rotation.set(-0.12 * ease, d.yaw, -0.2 * ease, 'YXZ');
    return true;
  }
  restore(model, flash) {
    for (const [m, original] of flash.materials) {
      m.emissive.copy(original.color);
      m.emissiveIntensity = original.intensity;
    }
    if (model.visual) model.visual.rotation.z = flash.roll;
  }
  removeBurst(b) {
    for (const mesh of [b.points, b.ring])
      if (mesh) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
  }
  update(dt, camera, player) {
    this.clock += dt;
    this.pulse = Math.max(0, this.pulse - dt);
    if (this.death) {
      this.death.age += dt;
      if (this.death.age > 0.85) this.ui.canvas?.classList.remove('death-view');
    }
    const pulse = (this.pulse / 0.65) ** 2;
    if (this.ui.flash)
      this.ui.flash.style.opacity = player?.alive
        ? Math.min(0.7, pulse * 0.65 + (player.hp < 30 ? 0.1 : 0))
        : pulse * 0.45;
    const angle = impactAngle(this.hurtPosition || { x: 0, z: 0 }, this.origin, camera.rotation.y);
    if (this.ui.direction) {
      this.ui.direction.style.opacity =
        player?.alive && angle !== null ? Math.min(1, this.pulse * 3) : 0;
      this.ui.direction.style.transform = `translate(-50%,-50%) rotate(${angle || 0}rad)`;
    }
    if (player?.alive && pulse) {
      camera.rotation.z = Math.sin(this.clock * 48) * 0.012 * pulse * this.power;
    }
    for (const [model, flash] of this.flashes) {
      flash.age += dt;
      const strength = Math.max(0, 1 - flash.age / 0.2);
      for (const [m, original] of flash.materials) {
        m.emissive.copy(original.color).lerp(new T.Color(flash.color), strength * 0.65);
        m.emissiveIntensity = original.intensity + strength * 0.8;
      }
      if (model.visual)
        model.visual.rotation.z = flash.roll + Math.sin(flash.age * 34) * 0.065 * strength;
      if (flash.age >= 0.2) {
        this.restore(model, flash);
        this.flashes.delete(model);
      }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      if (b.age >= b.life) {
        this.removeBurst(b);
        this.bursts.splice(i, 1);
        continue;
      }
      const a = b.points.geometry.attributes.position;
      for (let k = 0; k < a.count; k++) {
        a.setXYZ(
          k,
          a.getX(k) + b.velocity[k * 3] * dt,
          a.getY(k) + b.velocity[k * 3 + 1] * dt,
          a.getZ(k) + b.velocity[k * 3 + 2] * dt,
        );
        b.velocity[k * 3 + 1] -= dt * 2;
      }
      a.needsUpdate = true;
      b.points.material.opacity = 1 - b.age / b.life;
      if (b.ring) {
        b.ring.scale.setScalar(1 + b.age * 5);
        b.ring.material.opacity = (1 - b.age / b.life) * 0.7;
      }
    }
  }
  reset() {
    for (const b of this.bursts) this.removeBurst(b);
    this.bursts = [];
    for (const [model, flash] of this.flashes) this.restore(model, flash);
    this.flashes.clear();
    this.pulse = 0;
    this.death = null;
    this.origin = null;
    this.ui.canvas?.classList.remove('death-view');
    if (this.ui.flash) this.ui.flash.style.opacity = 0;
    if (this.ui.direction) this.ui.direction.style.opacity = 0;
  }
}
