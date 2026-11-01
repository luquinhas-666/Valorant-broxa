export const SOUND_FILES = [
  'shot-pistol',
  'shot-rifle',
  'shot-smg',
  'shot-shotgun',
  'shot-sniper',
  'shot-heavy',
  'step-stone',
  'step-metal',
  'step-grass',
  'impact',
  'hit',
  'hurt',
  'reload',
  'explosion',
  'skill',
  'knife',
  'beep',
  'buy',
  'kill',
  'plant',
  'defuse',
  'checkpoint',
  'start',
  'roundWin',
  'roundLoss',
];
const raw = new Map();
export async function preloadSounds(read = null) {
  if (!read && typeof fetch === 'undefined') return 0;
  await Promise.allSettled(
    SOUND_FILES.map(async (name) => {
      const url = new URL(`./assets/audio/${name}.wav`, import.meta.url);
      const bytes = read
        ? await read(url)
        : await fetch(url, { signal: AbortSignal.timeout(15000) }).then((r) => {
            if (!r.ok) throw Error(name);
            return r.arrayBuffer();
          });
      raw.set(name, bytes);
    }),
  );
  return raw.size;
}
export function soundKey(type, variant = '') {
  if (type === 'shot') {
    if (variant === 'knife') return 'knife';
    if (['operator', 'scout'].includes(variant)) return 'shot-sniper';
    if (['nova', 'judge', 'shorty'].includes(variant)) return 'shot-shotgun';
    if (['ares', 'odin'].includes(variant)) return 'shot-heavy';
    if (['ghost', 'stinger'].includes(variant)) return 'shot-smg';
    if (['pulse', 'whisper', 'frenzy', 'revolver'].includes(variant)) return 'shot-pistol';
    return 'shot-rifle';
  }
  return type === 'step'
    ? 'step-' + (['stone', 'metal', 'grass'].includes(variant) ? variant : 'stone')
    : type;
}
export function audibility(listener, source, yaw = 0, occluded = false, range = 45) {
  if (!source) return { gain: 1, pan: 0 };
  const dx = source.x - listener.x,
    dz = source.z - listener.z,
    d = Math.hypot(dx, dz);
  return {
    gain: Math.max(0, 1 - d / range) ** 1.5 * (occluded ? 0.3 : 1),
    pan: d ? Math.max(-1, Math.min(1, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / d)) : 0,
  };
}
export class GameAudio {
  constructor(context) {
    this.context = context;
    this.master = context.createGain();
    this.master.connect(context.destination);
    this.master.gain.value = 0.35;
    this.buffers = new Map();
    this.voices = new Set();
    this.listener = { x: 0, z: 0 };
    this.yaw = 0;
    this.ready = Promise.allSettled(
      [...raw].map(async ([name, bytes]) =>
        this.buffers.set(name, await context.decodeAudioData(bytes.slice(0))),
      ),
    );
  }
  resume() {
    return this.context.resume();
  }
  update(listener, yaw, volume) {
    this.listener = { x: listener.x, z: listener.z };
    this.yaw = yaw;
    this.master.gain.value = volume;
  }
  play(type, volume = 1, position = null, variant = '', occluded = false) {
    if (this.context.state !== 'running' || this.master.gain.value === 0) return;
    const key = soundKey(type, variant),
      buffer = this.buffers.get(key);
    if (!buffer) return;
    const spatial = audibility(
      this.listener,
      position,
      this.yaw,
      occluded,
      type === 'step' ? 25 : type === 'beep' ? 40 : 55,
    );
    if (spatial.gain < 0.012) return;
    if (this.voices.size >= 32) {
      const oldest = this.voices.values().next().value;
      this.voices.delete(oldest);
      oldest.stop();
    }
    const source = this.context.createBufferSource(),
      gain = this.context.createGain(),
      pan = this.context.createStereoPanner();
    source.buffer = buffer;
    source.playbackRate.value = type === 'step' ? 0.94 + Math.random() * 0.12 : 1;
    gain.gain.value =
      Math.min(1, volume) * spatial.gain * (type === 'shot' ? 0.65 : type === 'step' ? 0.62 : 0.75);
    pan.pan.value = spatial.pan;
    source.connect(gain);
    gain.connect(pan);
    pan.connect(this.master);
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
      pan.disconnect();
    };
    source.start();
  }
}
