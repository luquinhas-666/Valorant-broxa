import { GameAudio, preloadSounds } from './audio.js';
import { CombatFeedback } from './combat-fx.js';
import { loadEnvironmentAssets } from './environment.js';
import { surfaceAt } from './map-layout.js';
import { loadModelAssets } from './models.js';
import { setupOnline } from './online.js';
import * as T from './vendor/three.module.js';
import { MODES, attackSide, matchWinner, ROUTES } from './rules.js';
import { createWorld, createSoldier, SITES, BLOCKS, MAP, SPAWNS, CALLOUTS } from './world.js';
import { createWeaponModel } from './arsenal.js';
import { WEAPONS, AGENTS, portrait, weaponIcon, WEAPON_CATEGORIES } from './data.js';

const $ = (id) => document.getElementById(id),
  show = (id) => $(id).classList.remove('hidden'),
  hide = (id) => $(id).classList.add('hidden');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const vec = (p, y = 1.4) => new T.Vector3(p.x, y, p.z);
const [assetReport, environmentReport] = await Promise.all([
  loadModelAssets(),
  loadEnvironmentAssets(),
  preloadSounds(),
]);
function disposeModelTree(root) {
  const geometries = new Set(),
    materials = new Set(),
    skeletons = new Set();
  root.traverse((o) => {
    if (o.geometry && !geometries.has(o.geometry)) {
      geometries.add(o.geometry);
      o.geometry.dispose();
    }
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])
      if (!materials.has(m)) {
        materials.add(m);
        m.dispose();
      }
    if (o.skeleton && !skeletons.has(o.skeleton)) {
      skeletons.add(o.skeleton);
      o.skeleton.dispose();
    }
  });
}
let renderer, world, scene, camera;
export { world as arenaWorld };
let multiplayerServer = false,
  onlineClient = null,
  onlineGame = false,
  networkViewTeam = 0;
const myTeam = () => player?.team ?? 0;
let tacticalOpen = false;
const tactical = $('tactical-canvas').getContext('2d');
function toggleTactical() {
  tacticalOpen = !tacticalOpen;
  $('tactical-map').classList.toggle('hidden', !tacticalOpen);
  resetInput();
}
try {
  renderer = new T.WebGLRenderer({
    canvas: $('game'),
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  world = createWorld(renderer);
  scene = world.scene;
  camera = new T.PerspectiveCamera(78, innerWidth / innerHeight, 0.04, 150);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
} catch (error) {
  hide('loading');
  show('fatal');
  $('fatal-message').textContent = error.message;
  throw error;
}

const combatFX = new CombatFeedback(scene, {
  canvas: $('game'),
  flash: $('damage-flash'),
  direction: $('damage-direction'),
  killer: $('death-killer'),
});
let settings = { sensitivity: 1, volume: 0.35, quality: 'high' };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem('rupture-settings') || '{}'));
} catch {}
let chosen = 0;
try {
  chosen = clamp(Number(localStorage.getItem('rupture-agent') || 0), 0, AGENTS.length - 1);
} catch {}
let selectedMode = 'competitive',
  mode = MODES.competitive,
  attackPlan = 'A',
  teamLosses = [0, 0],
  previewModel = null;
try {
  selectedMode = localStorage.getItem('rupture-mode') || 'competitive';
} catch {}
if (!MODES[selectedMode]) selectedMode = 'competitive';
mode = MODES[selectedMode];
let state = 'menu',
  round = 0,
  score = [0, 0],
  attackTeam = 0,
  clock = 30,
  paused = false,
  shopOpen = false,
  locked = false,
  freeMouse = false,
  allowUnlock = false,
  started = false;
let actors = [],
  player,
  spike = {
    planted: false,
    carrier: null,
    drop: null,
    pos: null,
    time: 35,
    progress: 0,
    site: null,
  },
  agents = AGENTS[chosen];
let primary = null,
  pistol = { id: 'pulse', ammo: 12, reserve: 48 },
  slot = 2,
  credits = 800,
  losses = 0,
  ult = 3,
  skills = [],
  skillTimers = {},
  effects = [],
  shots = [],
  dangerZones = [];
let yaw = 0,
  pitch = 0,
  vertical = 0,
  feet = 0,
  grounded = true,
  moving = 0,
  bob = 0,
  recoil = 0,
  spreadKick = 0,
  fireCooldown = 0,
  reloading = 0,
  aim = false,
  fireHeld = false,
  semiLatch = false,
  interactProgress = 0;
let toastTime = 0,
  killConfirmTime = 0,
  hitTime = 0,
  flashTime = 0,
  phaseTime = 0,
  worldTime = 0,
  beepTimer = 0,
  specTarget = null;
let kills = 0,
  deaths = 0,
  headshots = 0,
  roundKills = 0;
const keys = new Set(),
  ray = new T.Raycaster(),
  tmp = new T.Vector3();
const gun = new T.Group();
camera.add(gun);
const gunFlash = new T.Mesh(
  new T.OctahedronGeometry(0.09),
  new T.MeshBasicMaterial({ color: '#ffd8a2' }),
);
gunFlash.visible = false;
gun.add(gunFlash);
function weapon() {
  return slot === 1 && primary
    ? primary
    : slot === 3
      ? { id: 'knife', ammo: Infinity, reserve: 0 }
      : pistol;
}
function buildGun() {
  if (multiplayerServer) return;
  for (const child of [...gun.children])
    if (child !== gunFlash) {
      gun.remove(child);
      disposeModelTree(child);
    }
  const instance = weapon(),
    model = createWeaponModel(instance.id, WEAPONS[instance.id], agents.color);
  gun.add(model.group);
  gunFlash.position.copy(model.muzzle);
  gun.position.set(0.27, -0.23, -0.72);
  gun.rotation.set(0, 0, 0);
}
let audio = null;
function sound(type, volume = 1, position = null, variant = '', to = null) {
  const ui = ['hit', 'hurt', 'kill', 'buy'].includes(type);
  if (!position && ['shot', 'step', 'reload', 'skill', 'hurt', 'knife'].includes(type))
    position = player?.pos;
  if (type === 'shot' && !variant) variant = weapon().id;
  if (type === 'step' && !variant) variant = surfaceAt(position || { x: 0, z: 0 });
  if (multiplayerServer) {
    networkSounds.push({
      id: ++netSequence,
      at: worldTime,
      type,
      volume,
      position: position ? { x: position.x, z: position.z } : null,
      variant,
      to: to || (ui ? player?.id : null),
    });
    if (networkSounds.length > 64) networkSounds.shift();
    return;
  }
  if (!audio) return;
  const blocked =
    position &&
    Math.hypot(position.x - camera.position.x, position.z - camera.position.z) > 3 &&
    !world.clearLine(vec(camera.position, 1.5), vec(position, 1.5));
  audio.play(type, volume, position, variant, !!blocked);
}
function initAudio() {
  if (!audio)
    try {
      audio = new GameAudio(new (window.AudioContext || window.webkitAudioContext)());
    } catch {}
  audio?.update(camera.position, yaw, settings.volume);
  audio?.resume().catch(() => {});
}
function toast(text) {
  $('toast').textContent = text;
  show('toast');
  toastTime = 3;
}
function resetInput() {
  keys.clear();
  fireHeld = false;
  semiLatch = false;
  aim = false;
  interactProgress = 0;
}
function unlock() {
  allowUnlock = true;
  document.exitPointerLock?.();
  locked = false;
  resetInput();
}
function mouseFallback() {
  if (state === 'menu' || state === 'match' || shopOpen) return;
  freeMouse = true;
  paused = false;
  hide('pause');
  show('free-mouse-hint');
  toast('Mouse livre: segure o botão direito para olhar. Clique esquerdo para atirar.');
  toastTime = 7;
}
function capture() {
  initAudio();
  try {
    const result = $('game').requestPointerLock();
    result?.catch(mouseFallback);
  } catch {
    mouseFallback();
  }
}
function showPause() {
  if (state === 'menu' || state === 'match') return;
  tacticalOpen = false;
  hide('tactical-map');
  paused = true;
  shopOpen = false;
  hide('shop');
  hide('scoreboard');
  show('pause');
  unlock();
}
function resume() {
  hide('pause');
  paused = false;
  capture();
}
function setAim(value) {
  aim = value;
}
function previewAgent() {
  if (previewModel) {
    camera.remove(previewModel.group);
    previewModel.dispose?.();
    disposeModelTree(previewModel.group);
  }
  previewModel = createSoldier(agents.color, false, agents.id);
  previewModel.group.position.set(1.6, -2.4, -4.8);
  previewModel.group.scale.setScalar(2.3);
  previewModel.group.rotation.y = Math.PI + 0.12;
  previewModel.group.traverse((o) => (o.castShadow = false));
  previewModel.badge.visible = false;
  camera.add(previewModel.group);
  $('agent-name').textContent = agents.name;
  $('agent-role').textContent = agents.role;
  $('agent-description').textContent = agents.description;
}
function drawModes() {
  for (const id of ['competitive', 'quick']) {
    const button = $('mode-' + id);
    button.classList.toggle('selected', selectedMode === id);
    button.setAttribute('aria-pressed', selectedMode === id);
    button.onclick = () => {
      selectedMode = id;
      mode = MODES[id];
      try {
        localStorage.setItem('rupture-mode', id);
      } catch {}
      drawModes();
    };
  }
  $('mode-description').textContent =
    selectedMode === 'competitive'
      ? '5 × 5 CONTRA BOTS / 13 VITÓRIAS · VENCER POR 2'
      : '3 × 3 CONTRA BOTS / PRIMEIRO A 4 ROUNDS';
}
function drawAgents() {
  const cards = $('agent-cards');
  cards.innerHTML = '';
  AGENTS.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = 'agent-card' + (i === chosen ? ' selected' : '');
    b.innerHTML = portrait(a) + `<div><strong>${a.name}</strong><small>${a.role}</small></div>`;
    b.title = a.description;
    b.setAttribute('aria-pressed', i === chosen);
    b.onclick = () => {
      chosen = i;
      agents = a;
      try {
        localStorage.setItem('rupture-agent', i);
      } catch {}
      drawAgents();
    };
    cards.append(b);
  });
  previewAgent();
}
function drawSkills() {
  const el = $('abilities');
  el.innerHTML = '';
  agents.skills.forEach((s, i) => {
    const left = i === 3 ? ult : skills[i];
    const div = document.createElement('div');
    div.className =
      'ability' +
      ((i === 3 ? ult < 6 : left <= 0) ? ' empty' : '') +
      (i === 3 && ult >= 6 ? ' ult-ready' : '');
    div.title = s.name;
    div.innerHTML = `<span class="ability-symbol">${s.symbol}</span><div class="charges">${Array.from({ length: i === 3 ? 6 : s.charges }, (_, n) => `<i style="opacity:${n < left ? 1 : 0.15}"></i>`).join('')}</div><kbd>${s.key}</kbd><span class="ability-name">${s.name}</span>`;
    el.append(div);
  });
}
function drawTeams() {
  for (const [id, team] of [
    ['team-blue', 0],
    ['team-red', 1],
  ]) {
    $(id).innerHTML = actors
      .filter((a) => a.team === team)
      .map((a) => `<span class="team-token ${a.alive ? '' : 'dead'}">${a.name[0]}</span>`)
      .join('');
  }
}
function refreshHUD() {
  $('health').textContent = Math.ceil(player?.hp || 0);
  $('health').style.color = player?.hp < 30 ? '#ff7b83' : '';
  $('armor').textContent = Math.ceil(player?.armor || 0);
  const w = weapon();
  $('ammo').textContent = w.id === 'knife' ? '∞' : reloading > 0 ? '··' : w.ammo;
  $('reserve').textContent = w.reserve;
  $('weapon-name').textContent = WEAPONS[w.id].name + (reloading > 0 ? ' · RECHARGE' : '');
  $('credits').textContent = `¤ ${credits.toLocaleString('pt-BR')}`;
  $('score-blue').textContent = score[0];
  $('score-red').textContent = score[1];
  $('round-label').textContent = `ROUND ${String(round + 1).padStart(2, '0')}`;
  $('side-label').textContent = attackTeam === myTeam() ? 'ATAQUE' : 'DEFESA';
  drawSkills();
  drawTeams();
}

function makeActor(team, i, isPlayer = false, selectedAgent = null) {
  const available = AGENTS.filter(
    (agent) => !actors.some((a) => a.team === team && a.agent.id === agent.id),
  );
  const agent = selectedAgent || (isPlayer ? agents : available[(i + team) % available.length]);
  const model = createSoldier(
    agent.color,
    onlineGame ? team !== networkViewTeam : team === 1,
    agent.id,
  );
  scene.add(model.group);
  const a = {
    team,
    name: agent.name,
    agent,
    isPlayer,
    model,
    alive: true,
    hp: 100,
    armor: 0,
    pos: { x: 0, z: 0 },
    kills: 0,
    deaths: 0,
    route: [],
    routeTime: 0,
    shootTime: 0.8,
    thinkTime: 0,
    blind: 0,
    reveal: 0,
    plant: 0,
    defuse: 0,
    walking: 0,
    goal: null,
    heading: 0,
    bank: 800,
    weaponId: 'pulse',
    ammo: 12,
    reserve: 48,
    reloadTime: 0,
    burst: 0,
    memory: null,
    memoryTime: 0,
    slow: 0,
    stim: 0,
    disarmed: 0,
    resist: 0,
    utility: 2,
    utilityTime: 8,
    routeStep: 0,
    plan: 0,
    muzzleTime: 0,
  };
  model.targets.forEach((m) => (m.userData.actor = a));
  return a;
}
function botLoadout(a, reset) {
  if (reset) {
    a.bank = typeof reset === 'number' ? reset : 800;
    a.weaponId = 'pulse';
    a.armor = 0;
  } else if (!a.alive) {
    a.weaponId = 'pulse';
    a.armor = 0;
  }
  const n = actors.filter((b) => b.team === a.team).indexOf(a),
    options =
      n === mode.size - 1 ? ['operator', 'marshal', 'ghost'] : ['phantom', 'marshal', 'ghost'];
  if (a.weaponId === 'pulse')
    for (const id of options) {
      if (a.bank >= WEAPONS[id].price + 400) {
        a.bank -= WEAPONS[id].price;
        a.weaponId = id;
        break;
      }
    }
  if (a.bank >= 1000 && a.armor < 50) {
    a.bank -= 1000;
    a.armor = 50;
  } else if (a.bank >= 400 && a.armor < 25) {
    a.bank -= 400;
    a.armor = 25;
  }
  a.ammo = WEAPONS[a.weaponId].mag;
  a.reserve = WEAPONS[a.weaponId].reserve;
  a.reloadTime = 0;
}
function startMatch() {
  if (onlineGame) {
    onlineClient.command('rematch');
    return;
  }
  tacticalOpen = false;
  hide('tactical-map');
  $('net-info').textContent = '';
  mode = MODES[selectedMode];
  agents = AGENTS[chosen];
  teamLosses = [0, 0];
  attackPlan = 'A';
  if (previewModel) previewModel.group.visible = false;
  for (const a of actors) disposeActor(a);
  actors = [];
  for (let i = 0; i < mode.size; i++) actors.push(makeActor(0, i, i === 0));
  for (let i = 0; i < mode.size; i++) actors.push(makeActor(1, i));
  player = actors[0];
  round = 0;
  score = [0, 0];
  credits = 800;
  losses = 0;
  kills = 0;
  deaths = 0;
  headshots = 0;
  ult = mode.id === 'competitive' ? 0 : 3;
  primary = null;
  pistol = { id: 'pulse', ammo: 12, reserve: 48 };
  slot = 2;
  paused = false;
  shopOpen = false;
  started = true;
  $('killfeed').innerHTML = '';
  hide('menu');
  hide('match-end');
  hide('pause');
  hide('scoreboard');
  show('hud');
  newRound();
  capture();
}
function disposeActor(a) {
  scene.remove(a.model.group);
  a.model.dispose?.();
  disposeModelTree(a.model.group);
}
function clearEffects() {
  for (const e of effects) {
    if (e.type === 'wall') {
      const oi = world.obstacles.indexOf(e.mesh),
        bi = BLOCKS.indexOf(e.block);
      if (oi >= 0) world.obstacles.splice(oi, 1);
      if (bi >= 0) BLOCKS.splice(bi, 1);
    }
    removeEffect(e);
  }
  effects = [];
  for (const s of shots) {
    scene.remove(s.mesh);
    s.mesh.geometry.dispose();
    s.mesh.material.dispose();
  }
  shots = [];
  dangerZones = [];
}
function newRound() {
  if (!multiplayerServer) combatFX.reset();
  clearEffects();
  clearDrop();
  if (spikeModel) spikeModel.visible = false;
  attackTeam = attackSide(round, mode);
  const halftime = round === mode.half,
    overtime = mode.id === 'competitive' && round >= 24;
  if (halftime || overtime) {
    credits = overtime ? 5000 : 800;
    primary = null;
    pistol = { id: 'pulse', ammo: 12, reserve: 48 };
    slot = 2;
    player.armor = 0;
  }
  world.setBuyPhase(true);
  clock = mode.buy;
  state = 'buy';
  phaseTime = 0;
  roundKills = 0;
  reloading = 0;
  fireCooldown = 0;
  interactProgress = 0;
  skillTimers = {};
  feet = 0;
  grounded = true;
  vertical = 0;
  recoil = 0;
  aim = false;
  actors.forEach((a) => {
    const wasAlive = a.alive;
    if (!wasAlive && a === player) {
      primary = null;
      pistol = { id: 'pulse', ammo: 12, reserve: 48 };
      slot = 2;
      a.armor = 0;
    }
    if (!a.isPlayer) a.alive = wasAlive;
    a.hp = 100;
    if (!a.isPlayer) botLoadout(a, overtime ? 5000 : halftime ? 800 : false);
    a.alive = true;
    a.lastImpact = null;
    a.slow = 0;
    a.stim = 0;
    a.disarmed = 0;
    a.resist = 0;
    a.memory = null;
    a.memoryTime = 0;
    a.utility = 2;
    a.utilityTime = 4 + Math.random() * 5;
    a.routeStep = 0;
    a.plan = actors.filter((b) => b.team === a.team).indexOf(a) % ROUTES.A.length;
    a.muzzleTime = 0;
    a.model.muzzle.visible = false;
    a.blind = 0;
    a.reveal = 0;
    a.route = [];
    a.routeTime = 0;
    a.shootTime = 0.8 + Math.random() * 0.7;
    a.thinkTime = 0;
    a.plant = 0;
    a.defuse = 0;
    const n = actors.filter((b) => b.team === a.team).indexOf(a);
    const attacking = a.team === attackTeam;
    a.pos = { x: [0, -4, 4, -7, 7][n], z: attacking ? SPAWNS.attack.z : SPAWNS.defense.z };
    a.heading = attacking ? 0 : Math.PI;
    a.model.group.visible = !a.isPlayer;
    a.model.badge.visible = a.team === 0;
    a.model.setAlive?.(true);
    a.model.group.rotation.z = 0;
    a.model.group.scale.setScalar(1);
    a.model.group.position.set(a.pos.x, 0, a.pos.z);
  });
  skills = agents.skills.slice(0, 3).map((s) => s.charges);
  yaw = attackTeam === 0 ? 0 : Math.PI;
  pitch = 0;
  const carrier = attackTeam === 0 ? player : actors.find((a) => a.team === attackTeam);
  spike = {
    planted: false,
    carrier,
    drop: null,
    pos: null,
    time: mode.spike,
    progress: 0,
    site: null,
    defuseFloor: 0,
    defuseOwner: null,
    pickupLock: 0,
  };
  if (primary) {
    primary.ammo = WEAPONS[primary.id].mag;
    primary.reserve = WEAPONS[primary.id].reserve;
  }
  pistol.ammo = WEAPONS[pistol.id].mag;
  pistol.reserve = WEAPONS[pistol.id].reserve;
  buildGun();
  gun.visible = true;
  hide('spectator');
  hide('scope');
  $('phase-small').textContent =
    `ROUND ${String(round + 1).padStart(2, '0')} · ${attackTeam === 0 ? 'ATAQUE' : 'DEFESA'}${round === mode.half ? ' · TROCA DE LADOS' : round >= 24 && mode.id === 'competitive' ? ' · PRORROGAÇÃO' : ''}`;
  $('phase-title').textContent = 'FASE DE COMPRA';
  $('phase-title').style.color = '';
  $('phase-sub').innerHTML =
    'Barreiras ativas · <kbd>B</kbd> Comprar · <kbd>Z</kbd> Plano A/B · <kbd>ENTER</kbd> Pronto';
  show('phase-banner');
  $('objective').textContent =
    attackTeam === 0
      ? 'PREPARE O ATAQUE · SPIKE COM SUA EQUIPE'
      : 'PREPARE A DEFESA · PROTEJA A E B';
  refreshHUD();
  toast(
    round === mode.half
      ? 'Troca de lados! Agora sua equipe defende.'
      : attackTeam === 0
        ? 'Você carrega a spike. Plante em A ou B segurando F.'
        : 'Defenda A e B. Desarme a spike segurando F.',
  );
}
function beginRound() {
  if (onlineGame) return onlineClient.command('ready');
  if (state !== 'buy') return;
  const needsCapture = shopOpen && !locked && !freeMouse;
  state = 'live';
  clock = mode.round;
  world.setBuyPhase(false);
  phaseTime = 0;
  closeShop(false);
  hide('phase-banner');
  sound('start');
  toast(
    attackTeam === 0
      ? 'Conquiste um ponto e plante a spike.'
      : 'Impeça o plantio. Proteja os pontos A e B.',
  );
  if (needsCapture) showPause();
}
function finishRound(winner, reason) {
  if (state !== 'live') return;
  state = 'end';
  if (reason.includes('desarmad')) sound('defuse', 1, spike.pos);
  spike.reason = reason;
  spike.outcome = spike.planted
    ? winner === attackTeam
      ? reason.includes('detonada')
        ? 'SPIKE DETONADA'
        : 'PONTO CONQUISTADO'
      : 'SPIKE DESARMADA'
    : winner === attackTeam
      ? 'ATAQUE VENCEU'
      : 'DEFESA VENCEU';
  $('objective').textContent = reason.toUpperCase();
  clock = 5.5;
  phaseTime = 0;
  score[winner]++;
  teamLosses[winner] = 0;
  teamLosses[1 - winner]++;
  for (const a of actors)
    if (!a.isPlayer)
      a.bank = Math.min(
        9000,
        a.bank + (a.team === winner ? 3000 : Math.min(1900 + (teamLosses[a.team] - 1) * 500, 2900)),
      );
  if (multiplayerServer) rewardHumans(winner);
  const won = winner === myTeam();
  losses = won ? 0 : losses + 1;
  const reward = won ? 3000 : Math.min(1900 + (losses - 1) * 500, 2900);
  credits = Math.min(9000, credits + reward);
  ult = Math.min(6, ult + 1);
  fireHeld = false;
  reloading = 0;
  aim = false;
  interactProgress = 0;
  hide('interaction');
  hide('scope');
  if (shopOpen) closeShop(false);
  $('phase-small').textContent =
    `ROUND ${String(round + 1).padStart(2, '0')} · ${won ? 'OBJETIVO CONCLUÍDO' : 'REORGANIZE SUA EQUIPE'}`;
  $('phase-title').textContent = won ? 'ROUND VENCIDO' : 'ROUND PERDIDO';
  $('phase-title').style.color = won ? '#84e6d2' : '#ff7c88';
  $('phase-sub').textContent = `${reason} · +${reward.toLocaleString('pt-BR')} créditos`;
  show('phase-banner');
  refreshHUD();
  if (multiplayerServer) sound('round', 1, null, String(winner));
  else sound(won ? 'roundWin' : 'roundLoss');
}
function endMatch() {
  state = 'match';
  unlock();
  hide('phase-banner');
  hide('hud');
  hide('pause');
  show('match-end');
  $('end-title').textContent = score[myTeam()] > score[1 - myTeam()] ? 'VITÓRIA' : 'DERROTA';
  $('end-title').style.color = score[myTeam()] > score[1 - myTeam()] ? '#84e6d2' : '#ff7c88';
  $('end-score').textContent = `${score[0]} : ${score[1]}`;
  $('end-stats').textContent =
    `${kills} eliminações · ${deaths} mortes · ${headshots} tiros na cabeça · ${agents.name}`;
}
function returnMenu() {
  combatFX.reset();
  tacticalOpen = false;
  hide('tactical-map');
  if (onlineGame) {
    onlineGame = false;
    onlineClient.leave();
  }
  state = 'menu';
  world.setBuyPhase(false);
  paused = false;
  shopOpen = false;
  unlock();
  clearEffects();
  for (const a of actors) a.model.group.visible = false;
  for (const id of ['hud', 'pause', 'shop', 'scoreboard', 'match-end']) hide(id);
  show('menu');
  gun.visible = false;
}

function openShop() {
  if (state !== 'buy') return toast('A loja abre na fase de compra.');
  if (!world.inBuyZone(player.pos, player.team === attackTeam))
    return toast('Volte à sua base para comprar.');
  shopOpen = true;
  unlock();
  drawShop();
  show('shop');
}
function closeShop(recapture = true) {
  const was = shopOpen;
  shopOpen = false;
  hide('shop');
  if (recapture && was && !paused) capture();
}
let shopCategory = 'all';
function drawShop() {
  const tabs = $('weapon-filters');
  tabs.innerHTML = '';
  for (const [family, name] of WEAPON_CATEGORIES) {
    const count = Object.values(WEAPONS).filter(
      (w) => w.family !== 'knife' && (family === 'all' || w.family === family),
    ).length;
    const button = document.createElement('button');
    button.className = 'weapon-filter' + (family === shopCategory ? ' active' : '');
    button.textContent = name + ' ' + count;
    button.setAttribute('aria-pressed', family === shopCategory);
    button.onclick = () => {
      shopCategory = family;
      drawShop();
    };
    tabs.append(button);
  }
  const list = $('weapon-shop');
  list.innerHTML = '';
  const catalog = Object.entries(WEAPONS)
    .filter(([id, w]) => id !== 'knife' && (shopCategory === 'all' || w.family === shopCategory))
    .sort((a, b) => b[1].slot - a[1].slot || a[1].price - b[1].price);
  for (const [id, w] of catalog) {
    const owned = pistol.id === id || primary?.id === id,
      b = document.createElement('button');
    b.className =
      'weapon-card' +
      (owned ? ' owned' : '') +
      (credits < w.price && !owned ? ' unaffordable' : '');
    b.innerHTML = `<span class="category">${w.category}</span>${owned ? '<span class="owned-label">EQUIPADA</span>' : ''}${weaponIcon(id)}<strong>${w.name}</strong><div class="weapon-bottom"><b>${w.price ? '¤ ' + w.price.toLocaleString('pt-BR') : 'GRÁTIS'}</b><span class="damage-stat">${w.mag} BALAS · ${w.damage}${w.pellets ? ' × ' + w.pellets : ''} DANO</span></div><div class="weapon-stats"><span>${w.auto ? 'AUTO' : 'SEMI'}</span><span>${w.scope ? 'ZOOM ' + w.scope + '×' : w.silenced ? 'SILENCIADA' : w.slot === 2 ? 'SECUNDÁRIA' : 'PRIMÁRIA'}</span><span>${w.reload.toFixed(1)}s RECARGA</span></div>`;
    b.onclick = () => buyWeapon(id);
    list.append(b);
  }
  $('shop-credits').textContent = credits.toLocaleString('pt-BR');
  $('shop-status').textContent =
    `${primary ? WEAPONS[primary.id].name + ' / ' : ''}${WEAPONS[pistol.id].name} · Escudo ${Math.ceil(player.armor)} / 50`;
  $('light-armor').disabled = player.armor >= 25 || credits < 400;
  $('heavy-armor').disabled = player.armor >= 50 || credits < 1000;
}
function buyWeapon(id) {
  if (onlineGame) return onlineClient.command('buy', id);
  if (state !== 'buy' || !shopOpen) return;
  const w = WEAPONS[id];
  if (!w || w.slot === 3) return;
  if ((w.slot === 2 ? pistol : primary)?.id === id) {
    slot = w.slot;
    buildGun();
    refreshHUD();
    $('shop-status').textContent = 'Arma equipada. Munição reposta em cada round.';
    return;
  }
  if (credits < w.price) {
    $('shop-status').textContent = 'Créditos insuficientes para esta arma.';
    return;
  }
  credits -= w.price;
  const instance = { id, ammo: w.mag, reserve: w.reserve };
  if (w.slot === 2) pistol = instance;
  else primary = instance;
  slot = w.slot;
  reloading = 0;
  aim = false;
  buildGun();
  drawShop();
  refreshHUD();
  sound('buy');
}
function buyArmor(amount, price) {
  if (onlineGame) return onlineClient.command('armor', amount);
  if (state !== 'buy' || !shopOpen || credits < price || player.armor >= amount) return;
  credits -= price;
  player.armor = amount;
  drawShop();
  refreshHUD();
  sound('buy');
}
function reload() {
  if (onlineGame) return onlineClient.command('reload');
  const w = weapon(),
    data = WEAPONS[w.id];
  if (
    !player?.alive ||
    reloading > 0 ||
    w.id === 'knife' ||
    w.ammo === data.mag ||
    w.reserve <= 0 ||
    !['buy', 'live'].includes(state)
  )
    return;
  reloading = data.reload;
  aim = false;
  sound('reload');
  refreshHUD();
}
function changeWeapon(n) {
  if (onlineGame) return onlineClient.command('slot', n);
  if (!player?.alive) return;
  if (n === 1 && !primary) {
    toast('Compre uma arma primária na loja [B].');
    return;
  }
  slot = n;
  reloading = 0;
  aim = false;
  spreadKick = 0;
  fireHeld = false;
  buildGun();
  refreshHUD();
}
function feed(attacker, target, head = false) {
  if (multiplayerServer) {
    networkFeed.push({ id: ++netSequence, attacker: attacker?.id, target: target.id, head });
    if (networkFeed.length > 6) networkFeed.shift();
  }
  const row = document.createElement('div');
  row.className = 'kill-row' + (attacker?.team === myTeam() ? ' friendly' : '');
  const a = document.createElement('b');
  a.textContent = attacker?.name || 'SPIKE';
  const icon = document.createElement('span');
  icon.className = 'gun';
  icon.textContent = head ? '⌖' : '━';
  const b = document.createElement('span');
  b.textContent = target.name;
  row.append(a, icon, b);
  $('killfeed').append(row);
  while ($('killfeed').children.length > 5) $('killfeed').firstChild.remove();
  setTimeout(() => row.remove(), 6500);
}
function damage(target, amount, attacker, head = false) {
  if (!target.alive || state !== 'live') return;
  if (target.resist > 0) amount *= 0.65;
  const absorbed = Math.min(target.armor, amount * 0.65);
  target.armor -= absorbed;
  target.hp = Math.max(0, target.hp - (amount - absorbed));
  target.lastImpact = {
    seq: (target.impactSeq = (target.impactSeq || 0) + 1),
    at: worldTime,
    head,
    shielded: absorbed > 0,
    amount,
    from: attacker ? { ...attacker.pos } : null,
    attacker: attacker?.name || 'AMBIENTE',
  };
  if (!multiplayerServer) {
    combatFX.impact(target, target.lastImpact);
    if (target === player) combatFX.hurt(target.pos, attacker?.pos, amount);
  }
  if (target === player) {
    sound('hurt', 0.7, target.pos, '', target.id);
    interactProgress = spike.planted ? spike.defuseFloor || 0 : 0;
    refreshHUD();
  }
  if (multiplayerServer && target.netData && target !== player)
    sound('hurt', 0.7, target.pos, '', target.id);
  target.plant = 0;
  target.defuse = spike.defuseFloor || 0;
  if (target.netData) target.netData.interactProgress = spike.planted ? spike.defuseFloor || 0 : 0;
  if (target.hp > 0) return;
  target.alive = false;
  if (!multiplayerServer) {
    combatFX.eliminate(target);
    if (target === player)
      combatFX.die({ ...target.pos, y: feet }, yaw, attacker?.name || 'AMBIENTE');
  }
  target.deaths++;
  if (attacker && attacker !== target) {
    attacker.kills++;
    if (!attacker.isPlayer) attacker.bank = Math.min(9000, attacker.bank + 200);
    if (attacker === player) {
      kills++;
      roundKills++;
      credits = Math.min(9000, credits + 200);
      ult = Math.min(6, ult + 1);
      if (head) headshots++;
      sound('kill');
      killConfirmTime = 1.5;
      $('kill-confirm-text').textContent = head
        ? 'TIRO NA CABEÇA'
        : roundKills > 1
          ? `${roundKills} ELIMINAÇÕES`
          : 'ELIMINAÇÃO';
      show('kill-confirm');
      refreshHUD();
    }
  }
  if (multiplayerServer && attacker?.netData && attacker !== player) {
    attacker.netData.credits = Math.min(9000, attacker.netData.credits + 200);
    attacker.netData.ult = Math.min(6, attacker.netData.ult + 1);
  }
  feed(attacker, target, head);
  if (spike.carrier === target) {
    spike.carrier = null;
    spike.drop = { ...target.pos };
    makeDrop();
  }
  if (target === player) {
    deaths++;
    gun.visible = false;
    aim = false;
    reloading = 0;
    hide('scope');
    show('spectator');
    specTarget = actors.find((a) => a.team === myTeam() && a.alive) || null;
  } else {
    target.model.setAlive?.(false);
    target.model.group.rotation.z = target.model.imported ? 0 : Math.PI / 2;
    target.model.group.position.y = target.model.imported ? 0 : 0.3;
    target.model.group.scale.setScalar(target.model.imported ? 1 : 0.8);
    target.model.badge.visible = false;
  }
  drawTeams();
  checkElimination();
}
function checkElimination() {
  if (state !== 'live') return;
  const atk = actors.some((a) => a.alive && a.team === attackTeam),
    def = actors.some((a) => a.alive && a.team !== attackTeam);
  if (!def) finishRound(attackTeam, 'Equipe defensora eliminada');
  else if (!atk && !spike.planted) finishRound(1 - attackTeam, 'Equipe atacante eliminada');
}
function tracer(from, to, color = '#ffdf9d') {
  const g = new T.BufferGeometry().setFromPoints([from, to]),
    m = new T.LineBasicMaterial({ color, transparent: true, opacity: 0.75 });
  const mesh = new T.Line(g, m);
  scene.add(mesh);
  shots.push({ mesh, ttl: 0.075 });
}
function shoot() {
  if (onlineGame) return;
  if (
    (!locked && !freeMouse) ||
    paused ||
    shopOpen ||
    !player?.alive ||
    player.disarmed > 0 ||
    state !== 'live' ||
    reloading > 0 ||
    fireCooldown > 0 ||
    keys.has('KeyF')
  )
    return;
  const instance = weapon(),
    w = WEAPONS[instance.id];
  if (!w.auto && semiLatch) return;
  semiLatch = true;
  if (instance.ammo <= 0) {
    reload();
    return;
  }
  instance.ammo--;
  player.muzzleTime = 0.065;
  fireCooldown = w.rate * (skillTimers.overdrive > 0 ? 0.7 : 1);
  recoil = Math.min(0.16, recoil + 0.028);
  spreadKick = Math.min(0.032, spreadKick + 0.004);
  gunFlash.visible = instance.id !== 'knife';
  sound('shot', w.silenced ? 0.4 : 1, player.pos, instance.id);
  const direction = new T.Vector3();
  camera.getWorldDirection(direction);
  let hitAnything = false;
  for (let pellet = 0; pellet < (w.pellets || 1); pellet++) {
    let spread =
      w.spread + (moving > 0.5 ? 0.018 : 0) + (!grounded ? 0.045 : 0) + spreadKick * 0.15;
    if (aim) spread *= w.scope ? 0.012 : 0.45;
    if (instance.id === 'knife') spread = 0;
    const d = direction
      .clone()
      .add(
        new T.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
        ),
      )
      .normalize();
    const origin = camera.position.clone();
    ray.set(origin, d);
    ray.far = instance.id === 'knife' ? 2.5 : 100;
    const targets = actors.filter((a) => a.alive && a !== player).flatMap((a) => a.model.targets);
    const hits = ray.intersectObjects([...world.obstacles, ...targets], false);
    const hit = hits[0];
    const end = hit ? hit.point : origin.clone().addScaledVector(d, 65);
    if (instance.id !== 'knife')
      tracer(
        origin.clone().add(new T.Vector3(0.16, -0.13, 0).applyQuaternion(camera.quaternion)),
        end,
      );
    if (hit?.object.userData.actor) {
      const target = hit.object.userData.actor;
      if (target.team === player.team) continue;
      const head = hit.object.userData.head;
      let dmg = w.damage * (head ? w.head : 1);
      if (w.pellets && hit.distance > 10) dmg *= Math.max(0.25, 1 - (hit.distance - 10) / 30);
      damage(target, dmg, player, head);
      hitAnything = true;
      hitTime = 0.17;
      $('hitmarker').style.color = head ? '#ff7181' : '#fff';
    } else if (hit && instance.id !== 'knife') {
      if (pellet === 0) sound('impact', 0.4, hit.point);
      const spark = new T.Mesh(
        new T.SphereGeometry(0.045, 4, 4),
        new T.MeshBasicMaterial({ color: '#ffe1ac' }),
      );
      spark.position.copy(hit.point);
      scene.add(spark);
      effects.push({ mesh: spark, ttl: 0.12, type: 'spark' });
    }
  }
  if (hitAnything) sound('hit');
  refreshHUD();
}

function effectSphere(position, radius, color, ttl, type = 'smoke') {
  const mesh = new T.Mesh(
    new T.SphereGeometry(radius, 20, 14),
    new T.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: type === 'smoke' ? 0.78 : 0.35,
      roughness: 1,
      depthWrite: false,
      side: T.DoubleSide,
    }),
  );
  mesh.position.copy(position);
  scene.add(mesh);
  const e = { mesh, ttl, max: ttl, type, radius, pos: position.clone() };
  effects.push(e);
  return e;
}
function removeEffect(e) {
  scene.remove(e.mesh);
  e.mesh.geometry?.dispose();
  if (Array.isArray(e.mesh.material)) e.mesh.material.forEach((m) => m.dispose());
  else e.mesh.material?.dispose();
}
function targetGround(range = 11) {
  const d = new T.Vector3();
  camera.getWorldDirection(d);
  const p = player.pos;
  for (let t = range; t > 1; t -= 0.4) {
    const x = p.x + d.x * t,
      z = p.z + d.z * t;
    if (!world.blocked(x, z, 0.6) && world.clearLine(vec(p), new T.Vector3(x, 1.4, z)))
      return new T.Vector3(x, 0.05, z);
  }
  return new T.Vector3(p.x, 0.05, p.z);
}
function skill(index) {
  if (onlineGame) return onlineClient.command('skill', index);
  if (state !== 'live' || !player.alive || paused || shopOpen || (!locked && !freeMouse)) return;
  const s = agents.skills[index];
  if (index === 3) {
    if (ult < 6) return toast(`Ultimate precisa de 6 pontos. Você tem ${ult}.`);
    ult = 0;
  } else {
    if (skills[index] <= 0) return toast('Habilidade já utilizada neste round.');
    skills[index]--;
  }
  const p = player.pos,
    d = new T.Vector3();
  camera.getWorldDirection(d);
  sound('skill', 0.8, player.pos, s.kind);
  if (s.kind === 'dash') {
    const forward = keys.has('KeyS') ? -1 : 1,
      strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const mx = strafe ? Math.cos(yaw) * strafe : -Math.sin(yaw) * forward,
      mz = strafe ? -Math.sin(yaw) * strafe : -Math.cos(yaw) * forward;
    world.move(p, mx * 7, mz * 7, 0.4, feet);
    toast('Passo vetor');
  } else if (s.kind === 'smoke') {
    const t = targetGround(12);
    t.y = 1.65;
    effectSphere(t, 3.8, agents.color, 10, 'smoke');
    toast('Névoa ativa por 10 segundos. Bloqueia a visão dos bots.');
  } else if (s.kind === 'heal') {
    player.hp = Math.min(100, player.hp + (s.amount || 45));
    skillTimers.speed = 5;
    toast('Vida recuperada · +' + (s.amount || 45));
  } else if (s.kind === 'flash') {
    const t = targetGround(15);
    let count = 0;
    for (const a of actors)
      if (
        a.team !== myTeam() &&
        a.alive &&
        dist(a.pos, t) < 12 &&
        world.clearLine(vec(a.pos), t.clone().setY(1.5))
      ) {
        a.blind = 4;
        count++;
      }
    effectSphere(t.clone().setY(1.5), 1.5, '#fff3c4', 0.35, 'pulse');
    toast(`Clarão lançado · ${count} inimigo(s) afetado(s)`);
  } else if (s.kind === 'fire') {
    const t = targetGround(12);
    const disc = new T.Mesh(
      new T.CylinderGeometry(3.5, 3.5, 0.08, 32),
      new T.MeshBasicMaterial({ color: '#ff9450', transparent: true, opacity: 0.65 }),
    );
    disc.position.copy(t);
    scene.add(disc);
    const e = {
      mesh: disc,
      ttl: 7,
      type: 'fire',
      pos: t,
      radius: 3.5,
      team: player.team,
      owner: player,
    };
    effects.push(e);
    dangerZones.push(e);
    toast('Fogo vivo · área ativa por 7 segundos');
  } else if (s.kind === 'recon') {
    for (const a of actors)
      if (a.team !== myTeam() && a.alive) {
        a.reveal = 7;
        a.model.badge.visible = true;
      }
    effectSphere(vec(p, 0.2), 1, '#b7adf0', 1, 'recon');
    toast('Pulso · inimigos revelados no minimapa por 7 segundos');
  } else if (s.kind === 'wall') {
    const t = targetGround(6),
      w = 6,
      h = 3.5,
      depth = 0.6;
    const horizontal = Math.abs(d.z) > Math.abs(d.x);
    const block = { x: t.x, z: t.z, w: horizontal ? w : depth, d: horizontal ? depth : w, h };
    if (
      actors.some(
        (a) =>
          a.alive &&
          Math.abs(a.pos.x - t.x) < block.w / 2 + 0.7 &&
          Math.abs(a.pos.z - t.z) < block.d / 2 + 0.7,
      )
    ) {
      skills[index]++;
      return toast('Muito perto de um agente para criar a barreira.');
    }
    const mesh = new T.Mesh(
      new T.BoxGeometry(block.w, h, block.d),
      new T.MeshStandardMaterial({
        color: '#a698dc',
        emissive: '#8a74bf',
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.85,
      }),
    );
    mesh.position.set(t.x, h / 2, t.z);
    scene.add(mesh);
    world.obstacles.push(mesh);
    BLOCKS.push(block);
    effects.push({ mesh, ttl: 12, type: 'wall', block });
    toast('Barreira ativa por 12 segundos');
  } else if (s.kind === 'overdrive') {
    skillTimers.overdrive = 12;
    skillTimers.speed = 12;
    toast('SOBRECARGA · velocidade e cadência aumentadas por 12 segundos');
  } else if (s.kind === 'solar') {
    const t = targetGround(15);
    effectSphere(t.clone().setY(1), 6, '#ffc768', 1.5, 'pulse');
    for (const a of actors)
      if (
        a.alive &&
        a.team !== myTeam() &&
        dist(a.pos, t) < 7 &&
        world.clearLine(vec(a.pos), t.clone().setY(1.5))
      )
        damage(a, 150, player);
    toast('SOLAR · explosão de energia no ponto de mira');
  } else if (s.kind === 'restore') {
    for (const a of actors)
      if (a.alive && a.team === myTeam()) {
        a.hp = 100;
        a.armor = Math.max(a.armor, 25);
      }
    toast('RESTAURAÇÃO · equipe curada e protegida');
  }
  if (['shield', 'fortify'].includes(s.kind)) {
    const targets =
      s.kind === 'fortify' ? actors.filter((a) => a.alive && a.team === myTeam()) : [player];
    for (const a of targets) {
      a.armor = Math.max(a.armor, 50);
      if (s.kind === 'fortify') a.resist = 8;
    }
    toast(
      s.kind === 'fortify'
        ? 'FORTALEZA · proteção reforçada por 8 segundos'
        : 'Escudo restaurado para 50',
    );
  } else if (s.kind === 'slow') {
    const t = targetGround(12),
      mesh = new T.Mesh(
        new T.CylinderGeometry(3.5, 3.5, 0.05, 32),
        new T.MeshBasicMaterial({ color: agents.color, transparent: true, opacity: 0.45 }),
      );
    mesh.position.copy(t);
    scene.add(mesh);
    effects.push({ mesh, pos: t, radius: 3.5, ttl: 8, type: 'slow', team: player.team });
    toast('Campo lento ativo por 8 segundos');
  } else if (s.kind === 'blink') {
    const t = targetGround(7);
    world.move(player.pos, t.x - player.pos.x, t.z - player.pos.z, 0.38, feet);
    effectSphere(vec(player.pos), 0.7, agents.color, 0.5, 'pulse');
    toast('Travessia concluída');
  } else if (s.kind === 'decoy') {
    const t = targetGround(8);
    effectSphere(t.clone().setY(1), 0.45, agents.color, 7, 'decoy');
    for (const a of actors)
      if (a.alive && a.team !== myTeam() && dist(a.pos, t) < 22) {
        a.memory = { x: t.x, z: t.z };
        a.memoryTime = 6;
        a.routeTime = 0;
      }
    toast('Isca lançada · atraindo a atenção inimiga');
  } else if (s.kind === 'blackout') {
    for (const a of actors)
      if (a.alive && a.team !== myTeam() && dist(a.pos, p) < 20) {
        a.blind = 4;
        a.reveal = 5;
      }
    effectSphere(vec(p), 2, agents.color, 1, 'recon');
    toast('ECLIPSE · inimigos próximos cegados e revelados');
  } else if (s.kind === 'emp') {
    for (const a of actors)
      if (a.alive && a.team !== myTeam() && dist(a.pos, p) < 18) {
        a.armor = 0;
        a.disarmed = 4;
      }
    effectSphere(vec(p), 1, agents.color, 1, 'recon');
    toast('PULSO EMP · remove escudos e bloqueia disparos por 4 segundos');
  } else if (s.kind === 'teamstim') {
    for (const a of actors) if (a.alive && a.team === myTeam()) a.stim = 8;
    skillTimers.speed = 8;
    toast('Estímulo de equipe ativo por 8 segundos');
  } else if (s.kind === 'revive') {
    const fallen = actors
      .filter((a) => !a.alive && a.team === myTeam() && a !== player && dist(a.pos, p) < 10)
      .sort((a, b) => dist(a.pos, p) - dist(b.pos, p))[0];
    if (!fallen) {
      ult = 6;
      toast('Aproxime-se de um aliado eliminado, até 10 metros.');
    } else {
      fallen.alive = true;
      fallen.model.setAlive?.(true);
      fallen.hp = 100;
      fallen.armor = 0;
      fallen.model.group.rotation.z = 0;
      fallen.model.group.scale.setScalar(1);
      fallen.model.group.visible = true;
      fallen.route = [];
      fallen.routeTime = 0;
      fallen.shootTime = 1.5;
      fallen.model.group.position.set(fallen.pos.x, 0, fallen.pos.z);
      effectSphere(vec(fallen.pos), 0.8, agents.color, 1, 'pulse');
      toast(fallen.name + ' voltou à operação');
      drawTeams();
    }
  } else if (s.kind === 'blastjump') {
    vertical = 10;
    feet = 0.05;
    grounded = false;
    skillTimers.speed = 3;
    toast('Salto tático');
  } else if (s.kind === 'grenade' || s.kind === 'rocket') {
    const t = targetGround(s.kind === 'rocket' ? 22 : 13),
      radius = s.kind === 'rocket' ? 5.5 : 4;
    effectSphere(t.clone().setY(0.8), radius, agents.color, 1, 'pulse');
    for (const a of actors)
      if (
        a.alive &&
        a.team !== myTeam() &&
        dist(a.pos, t) < radius &&
        world.clearLine(vec(a.pos), t.clone().setY(1.3))
      )
        damage(a, (s.kind === 'rocket' ? 170 : 90) * (1 - (0.5 * dist(a.pos, t)) / radius), player);
    sound('explosion', 1, t);
    toast(s.kind === 'rocket' ? 'RUPTURA · explosão no ponto de mira' : 'Fragmento lançado');
  }
  refreshHUD();
}

let spikeModel = null,
  dropModel = null;
function makeSpikeModel() {
  if (spikeModel) {
    scene.remove(spikeModel);
    spikeModel.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
  }
  spikeModel = new T.Group();
  const core = new T.Mesh(
    new T.CylinderGeometry(0.14, 0.29, 0.7, 6),
    new T.MeshStandardMaterial({ color: '#182f39', metalness: 0.6, roughness: 0.4 }),
  );
  core.position.y = 0.36;
  spikeModel.add(core);
  const light = new T.Mesh(
    new T.OctahedronGeometry(0.18),
    new T.MeshBasicMaterial({ color: '#92ffde' }),
  );
  light.position.y = 0.66;
  spikeModel.add(light);
  for (let i = 0; i < 3; i++) {
    const leg = new T.Mesh(
      new T.BoxGeometry(0.07, 0.09, 0.75),
      new T.MeshStandardMaterial({ color: '#86b9ae' }),
    );
    leg.position.y = 0.1;
    leg.rotation.y = (i / 3) * Math.PI * 2;
    spikeModel.add(leg);
  }
  const ring = new T.Mesh(
    new T.RingGeometry(0.8, 0.86, 40),
    new T.MeshBasicMaterial({
      color: '#8fffe0',
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.8,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  spikeModel.add(ring);
  spikeModel.position.set(spike.pos.x, 0, spike.pos.z);
  scene.add(spikeModel);
}
function makeDrop() {
  clearDrop();
  dropModel = new T.Group();
  const body = new T.Mesh(
    new T.BoxGeometry(0.38, 0.2, 0.44),
    new T.MeshStandardMaterial({ color: '#273e48', metalness: 0.5, roughness: 0.4 }),
  );
  dropModel.add(body);
  const glow = new T.Mesh(
    new T.BoxGeometry(0.24, 0.025, 0.31),
    new T.MeshBasicMaterial({ color: '#ffde95' }),
  );
  glow.position.y = 0.115;
  dropModel.add(glow);
  const arrow = new T.Mesh(
    new T.OctahedronGeometry(0.12),
    new T.MeshBasicMaterial({ color: '#ffe6a2' }),
  );
  arrow.position.y = 0.65;
  dropModel.add(arrow);
  dropModel.position.set(spike.drop.x, 0.4, spike.drop.z);
  scene.add(dropModel);
}
function clearDrop() {
  if (dropModel) {
    scene.remove(dropModel);
    dropModel.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    dropModel = null;
  }
}
function plant(actor) {
  if (
    spike.planted ||
    state !== 'live' ||
    !actor.alive ||
    actor.team !== attackTeam ||
    spike.carrier !== actor
  )
    return;
  const site = SITES.find((s) => dist(actor.pos, s) < s.r);
  if (!site) return;
  spike.planted = true;
  spike.carrier = null;
  spike.drop = null;
  spike.pos = { ...actor.pos };
  spike.site = site.name;
  spike.time = mode.spike;
  spike.defuseFloor = 0;
  spike.defuseOwner = null;
  spike.progress = 0;
  clearDrop();
  makeSpikeModel();
  interactProgress = 0;
  credits = Math.min(9000, credits + (actor.isPlayer ? 300 : 0));
  ult = Math.min(6, ult + (actor.isPlayer ? 1 : 0));
  toast(
    `SPIKE PLANTADA EM ${site.name} · ${actor.team === 0 ? 'Proteja o ponto' : 'Desarme a spike!'}`,
  );
  sound('plant', 1, spike.pos);
  refreshHUD();
}
function updateObjective(dt, timers = true, interaction = true) {
  if (timers) spike.pickupLock = Math.max(0, (spike.pickupLock || 0) - dt);
  if (spike.drop) {
    for (const a of actors)
      if (
        a.alive &&
        a.team === attackTeam &&
        dist(a.pos, spike.drop) < 1.6 &&
        (a !== (spike.dropper || player) || spike.pickupLock <= 0)
      ) {
        spike.carrier = a;
        spike.drop = null;
        clearDrop();
        if (a.isPlayer) toast('Spike recuperada. Plante em A ou B.');
        break;
      }
  }
  if (state !== 'live') {
    hide('interaction');
    return;
  }
  if (spike.planted && timers) {
    spike.time -= dt;
    beepTimer -= dt;
    if (beepTimer <= 0) {
      sound('beep', 0.8, spike.pos);
      beepTimer = spike.time < 7 ? 0.25 : spike.time < 15 ? 0.5 : 1;
    }
    if (spike.time <= 0) {
      effectSphere(vec(spike.pos, 1), 1, '#a6fff0', 2, 'explosion');
      sound('explosion', 1, spike.pos);
      finishRound(attackTeam, 'Spike detonada');
      return;
    }
  }
  if (!interaction) return;
  let action = null,
    required = 0;
  if (player.alive) {
    if (
      player.team === attackTeam &&
      spike.carrier === player &&
      !spike.planted &&
      feet < 0.05 &&
      SITES.some((s) => dist(player.pos, s) < s.r)
    ) {
      action = 'Segure para plantar a spike';
      required = mode.plant;
    } else if (
      player.team !== attackTeam &&
      spike.planted &&
      dist(player.pos, spike.pos) < 2.8 &&
      feet < 0.05
    ) {
      action = 'Segure para desarmar a spike';
      required = mode.defuse;
    }
  }
  if (action) {
    show('interaction');
    $('interaction-text').textContent = action;
    $('interaction').classList.toggle('defusing', spike.planted);
    if (keys.has('KeyF') && moving < 0.1) {
      if (spike.planted) interactProgress = Math.max(interactProgress, spike.defuseFloor || 0);
      interactProgress += dt;
      if (spike.planted && interactProgress >= mode.defuse / 2) {
        if (!spike.defuseFloor) sound('checkpoint', 0.7, spike.pos);
        spike.defuseFloor = mode.defuse / 2;
      }
      if (interactProgress >= required) {
        if (spike.planted) {
          credits = Math.min(9000, credits + 300);
          ult = Math.min(6, ult + 1);
          finishRound(1 - attackTeam, 'Spike desarmada');
        } else plant(player);
      }
    } else interactProgress = spike.planted ? spike.defuseFloor || 0 : 0;
    $('interaction-progress').style.width =
      `${clamp((interactProgress / required) * 100, 0, 100)}%`;
  } else {
    hide('interaction');
    interactProgress = spike.planted ? spike.defuseFloor || 0 : 0;
  }
  $('objective').textContent = spike.planted
    ? `◆ SPIKE PLANTADA · PONTO ${spike.site}`
    : spike.carrier === player
      ? '◇ VOCÊ CARREGA A SPIKE · PLANTE EM A OU B'
      : spike.drop
        ? '◇ SPIKE NO CHÃO'
        : attackTeam === 0
          ? 'CONQUISTE UM PONTO'
          : 'DEFENDA A E B';
}

function dropSpike() {
  if (onlineGame) return onlineClient.command('drop');
  if (
    !player?.alive ||
    spike.carrier !== player ||
    spike.planted ||
    !['buy', 'live'].includes(state)
  )
    return;
  spike.carrier = null;
  spike.drop = { ...player.pos };
  spike.pickupLock = 1.5;
  spike.dropper = player;
  makeDrop();
  toast('Spike solta · um aliado pode recolher');
}
function cyclePlan() {
  if (onlineGame) return onlineClient.command('plan');
  attackPlan = attackPlan === 'A' ? 'B' : 'A';
  for (const a of actors)
    if (a.team === 0) {
      a.routeStep = 0;
      a.routeTime = 0;
      a.route = [];
    }
  toast('Plano da equipe: ponto ' + attackPlan + ' · Z para alternar');
}
function updateObjectivePanel() {
  const planted = spike.planted,
    defending = attackTeam !== myTeam(),
    owned = spike.carrier === player;
  $('spike-state').textContent =
    state === 'buy'
      ? 'BARREIRAS ATIVAS'
      : planted
        ? 'SPIKE PLANTADA'
        : spike.drop
          ? 'SPIKE NO CHÃO'
          : owned
            ? 'VOCÊ CARREGA A SPIKE'
            : spike.carrier && !defending
              ? 'SPIKE: ' + spike.carrier.name
              : defending
                ? 'SPIKE COM O ATAQUE'
                : 'SPIKE';
  $('spike-task').textContent =
    state === 'buy'
      ? 'Prepare-se na sua zona. O mapa abre ao iniciar.'
      : planted
        ? defending
          ? 'Retome o ponto ' + spike.site + ' e segure F para desarmar.'
          : 'Proteja o ponto ' + spike.site + ' até a detonação.'
        : defending
          ? 'Defenda as entradas de A e B.'
          : owned
            ? 'Entre em A ou B e segure F por ' + mode.plant + 's.'
            : spike.drop
              ? 'Recupere a spike ou cubra o aliado que a busca.'
              : 'Acompanhe o portador até o ponto.';
  $('plan-label').textContent =
    mode.name +
    ' · ' +
    (round >= 24 && mode.id === 'competitive' ? 'PRORROGAÇÃO' : 'ROUND ' + (round + 1)) +
    ' · ' +
    (defending ? 'DEFESA' : 'PLANO ' + attackPlan);
  if (state === 'end') {
    $('spike-state').textContent = spike.outcome || 'ROUND ENCERRADO';
    $('spike-task').textContent = spike.reason + '. Próximo round em instantes.';
  }
  $('defuse-checkpoint').classList.toggle('hidden', !planted || !defending || !spike.defuseFloor);
}
function smokeBlocked(a, b) {
  for (const e of effects) {
    if (e.type !== 'smoke' || e.ttl < 0.7) continue;
    const ax = a.x - e.pos.x,
      az = a.z - e.pos.z,
      dx = b.x - a.x,
      dz = b.z - a.z,
      len = dx * dx + dz * dz;
    const u = len ? clamp(-(ax * dx + az * dz) / len, 0, 1) : 0;
    if (Math.hypot(ax + dx * u, az + dz * u) < e.radius * 0.9) return true;
  }
  return false;
}
function visible(a, b) {
  return (
    a.blind <= 0 &&
    dist(a.pos, b.pos) < 39 &&
    !smokeBlocked(a.pos, b.pos) &&
    world.clearLine(
      vec(a.pos, 1.6),
      vec(b.pos, (b.netData?.feet ?? b.netFeet ?? (b === player ? feet : 0)) + 1.4),
    )
  );
}
function chooseGoal(a) {
  const n = actors.filter((b) => b.team === a.team).indexOf(a),
    attacking = a.team === attackTeam;
  if (spike.planted) {
    if (!attacking) return spike.pos;
    const site = SITES.find((s) => s.name === spike.site),
      angle = n * 1.7;
    return { x: site.x + Math.cos(angle) * 3.8, z: site.z + Math.sin(angle) * 3.8 };
  }
  if (attacking) {
    if (spike.drop) return spike.drop;
    const name = a.team === 0 ? attackPlan : round % 2 ? 'B' : 'A',
      route = ROUTES[name][a.plan % ROUTES[name].length];
    while (a.routeStep < route.points.length - 1 && dist(a.pos, route.points[a.routeStep]) < 3)
      a.routeStep++;
    return route.points[Math.min(a.routeStep, route.points.length - 1)];
  }
  if (a.memory && a.memoryTime > 0) return a.memory;
  const site = SITES[n % 2];
  return { x: site.x + (n > 1 ? (n % 2 ? -3 : 3) : 0), z: site.z + (n > 2 ? 3 : -3) };
}
function botUtility(a, target) {
  if (a.utility <= 0 || a.utilityTime > 0 || !target) return;
  const kind = a.agent.skills[1].kind;
  sound('skill', 0.6, a.pos, kind);
  a.utility--;
  a.utilityTime = 14;
  if (kind === 'smoke' && dist(a.pos, target.pos) > 10) {
    const pos = vec(target.pos, 1.6);
    effectSphere(pos, 3, a.agent.color, 6, 'smoke');
  } else if (kind === 'flash' && world.clearLine(vec(a.pos), vec(target.pos))) {
    if (target === player) {
      flashTime = 0.8;
      toast('Clarão inimigo!');
    } else target.blind = 1.8;
    effectSphere(vec(target.pos, 1.7), 0.8, '#fff0b0', 0.3, 'pulse');
  } else if (kind === 'fire') {
    const t = vec(target.pos, 0.05),
      mesh = new T.Mesh(
        new T.CylinderGeometry(2.5, 2.5, 0.05, 24),
        new T.MeshBasicMaterial({ color: '#ff9568', transparent: true, opacity: 0.55 }),
      );
    mesh.position.copy(t);
    scene.add(mesh);
    const zone = { mesh, pos: t, radius: 2.5, ttl: 4, type: 'fire', team: a.team, owner: a };
    effects.push(zone);
    dangerZones.push(zone);
  } else if (kind === 'wall') {
    a.armor = Math.max(a.armor, 25);
  }
}
function updateBots(dt) {
  for (const a of actors) {
    if (a.isPlayer || !a.alive) continue;
    a.blind = Math.max(0, a.blind - dt);
    a.reveal = Math.max(0, a.reveal - dt);
    a.shootTime -= dt;
    a.routeTime -= dt;
    a.memoryTime -= dt;
    a.utilityTime -= dt;
    a.muzzleTime = Math.max(0, a.muzzleTime - dt);
    a.model.muzzle.visible = a.muzzleTime > 0;
    if (a.reloadTime > 0) {
      a.reloadTime -= dt;
      if (a.reloadTime <= 0) {
        const n = Math.min(WEAPONS[a.weaponId].mag, a.reserve);
        a.ammo = n;
        a.reserve -= n;
      }
    }
    let target = null,
      best = Infinity;
    for (const b of actors) {
      if (!b.alive || b.team === a.team) continue;
      const distance = dist(a.pos, b.pos);
      if (distance < best && visible(a, b)) {
        target = b;
        best = distance;
      }
    }
    if (target) {
      if (a.tracking !== target) {
        a.tracking = target;
        a.shootTime = Math.max(a.shootTime, 0.4 + Math.random() * 0.35);
      }
      a.memory = { ...target.pos };
      a.memoryTime = 5;
      botUtility(a, target);
    } else a.tracking = null;
    if (a.team !== 0 && player.alive && moving > 3 && dist(a.pos, player.pos) < 14) {
      a.memory = { ...player.pos };
      a.memoryTime = 3.5;
    }
    let walking = false;
    const defusing =
      spike.planted &&
      a.team !== attackTeam &&
      dist(a.pos, spike.pos) < 2.3 &&
      (!target || spike.time < mode.defuse + 1);
    if (target && !defusing) {
      a.heading = Math.atan2(-(target.pos.x - a.pos.x), -(target.pos.z - a.pos.z));
      if (a.shootTime <= 0 && a.blind <= 0 && a.disarmed <= 0 && a.reloadTime <= 0) {
        const w = WEAPONS[a.weaponId];
        if (a.ammo <= 0) {
          if (a.reserve > 0) {
            a.reloadTime = w.reload;
            sound('reload', 0.65, a.pos);
          } else {
            a.weaponId = 'pulse';
            a.ammo = 12;
            a.reserve = 36;
          }
        } else {
          a.ammo--;
          a.burst++;
          a.shootTime = w.rate + (a.burst >= 3 ? 0.28 : 0);
          if (a.burst >= 3) a.burst = 0;
          a.muzzleTime = 0.065;
          tracer(
            vec(a.pos, 1.3),
            vec(target.pos, target.isPlayer ? feet + 1.35 : 1.35),
            a.team === 0 ? '#b8fff0' : '#ffa77e',
          );
          sound('shot', WEAPONS[a.weaponId].silenced ? 0.4 : 1, a.pos, a.weaponId);
          const chance = clamp(
            0.68 - best * 0.011 - (target.isPlayer && moving > 3 ? 0.17 : 0),
            0.15,
            0.62,
          );
          if (Math.random() < chance) {
            const head = Math.random() < 0.035;
            let amount = w.damage * (head ? w.head : 1);
            if (w.pellets) amount *= Math.max(1, w.pellets * (1 - best / 24));
            damage(target, amount, a, head);
          }
        }
      }
      if (best > 25 && a.routeTime <= 0) {
        a.route = world.path(a.pos, target.pos);
        a.routeTime = 1.5;
      } else if (best <= 25) a.route = [];
      a.plant = 0;
      a.defuse = spike.defuseFloor || 0;
    } else {
      if (a.routeTime <= 0) {
        const goal = chooseGoal(a);
        a.goal = { ...goal };
        a.route = dist(a.pos, goal) > 1.4 ? world.path(a.pos, goal) : [];
        a.routeTime = 0.8 + Math.random() * 0.5;
      }
      if (a.blind > 0) {
        a.route = [];
        a.plant = 0;
        a.defuse = spike.defuseFloor || 0;
      } else if (defusing) {
        a.route = [];
        a.defuse = Math.max(a.defuse, spike.defuseFloor || 0) + dt;
        if (a.defuse >= mode.defuse / 2) {
          if (!spike.defuseFloor) sound('checkpoint', 0.7, spike.pos);
          spike.defuseFloor = mode.defuse / 2;
        }
        if (a.defuse >= mode.defuse) {
          finishRound(1 - attackTeam, 'Spike desarmada por ' + a.name);
          break;
        }
      } else a.defuse = spike.defuseFloor || 0;
      if (
        a === spike.carrier &&
        !spike.planted &&
        a.blind <= 0 &&
        SITES.some((s) => dist(a.pos, s) < s.r - 0.5)
      ) {
        a.route = [];
        a.plant += dt;
        if (a.plant >= mode.plant) plant(a);
      } else a.plant = 0;
    }
    if (state !== 'live') break;
    if (a.route.length && a.blind <= 0) {
      const waypoint = a.route[0],
        dx = waypoint.x - a.pos.x,
        dz = waypoint.z - a.pos.z,
        distance = Math.hypot(dx, dz);
      if (distance < 0.45) a.route.shift();
      else {
        let speed = target ? 2 : 3.7;
        if (a.slow > 0) speed *= 0.45;
        if (a.stim > 0) speed *= 1.25;
        const old = { ...a.pos };
        world.move(a.pos, (dx / distance) * speed * dt, (dz / distance) * speed * dt, 0.38);
        walking = dist(old, a.pos) > 0.005;
        if (!target) a.heading = Math.atan2(-dx, -dz);
        if (!walking) a.routeTime = 0;
      }
    }
    a.stepCooldown = (a.stepCooldown || 0) - dt;
    if (walking && !target && a.stepCooldown <= 0) {
      sound('step', 0.8, a.pos, surfaceAt(a.pos));
      a.stepCooldown = 0.42;
    }
    a.walking = walking ? a.walking + dt * 8 : 0;
    a.model.group.position.set(
      a.pos.x,
      walking ? Math.abs(Math.sin(a.walking)) * 0.018 : 0,
      a.pos.z,
    );
    a.model.group.rotation.y = a.heading;
    a.model.setWeapon?.(a.weaponId);
    a.model.animate(walking, a.walking, !!target, dt);
    a.model.badge.visible = a.team === 0 || a.reveal > 0 || (player.alive && visible(player, a));
  }
}

let footTimer = 0;
function updatePlayer(dt) {
  if (!player?.alive) return;
  fireCooldown = Math.max(0, fireCooldown - dt);
  spreadKick = Math.max(0, spreadKick - dt * 0.035);
  if (reloading > 0) {
    reloading -= dt;
    if (reloading <= 0) {
      const w = weapon(),
        n = Math.min(WEAPONS[w.id].mag - w.ammo, w.reserve);
      w.ammo += n;
      w.reserve -= n;
      refreshHUD();
      sound('reload');
    }
  }
  const crouch = keys.has('ControlLeft') || keys.has('ControlRight'),
    slow = keys.has('ShiftLeft') || keys.has('ShiftRight');
  let speed = crouch ? 2 : slow ? 2.6 : weapon().id === 'knife' ? 6.6 : 5.3;
  if (aim) speed *= 0.65;
  if (skillTimers.speed > 0 || player.stim > 0) speed *= 1.35;
  if (player.slow > 0) speed *= 0.45;
  let forward = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0),
    right = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  if (keys.has('KeyF')) {
    forward = 0;
    right = 0;
  }
  const length = Math.hypot(forward, right);
  moving = length ? speed : 0;
  if (length) {
    forward /= length;
    right /= length;
    world.move(
      player.pos,
      (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed * dt,
      (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed * dt,
      0.38,
      feet,
    );
    bob += dt * speed * 2;
    footTimer -= dt;
    if (footTimer <= 0 && !slow && !crouch && grounded) {
      sound('step');
      footTimer = 0.39;
    }
  }
  if (keys.has('Space') && grounded && !crouch && !keys.has('KeyF')) {
    vertical = 7;
    grounded = false;
  }
  const ceiling = world.ceilingHeight(player.pos.x, player.pos.z, feet + (crouch ? 1.1 : 1.7));
  vertical -= 20 * dt;
  let nextFeet = feet + vertical * dt;
  if (vertical > 0 && nextFeet + (crouch ? 1.1 : 1.7) > ceiling) {
    nextFeet = ceiling - (crouch ? 1.1 : 1.7);
    vertical = 0;
  }
  const floor = world.groundHeight(player.pos.x, player.pos.z, feet + 0.03);
  if (vertical <= 0 && nextFeet <= floor) {
    feet = floor;
    vertical = 0;
    grounded = true;
  } else {
    feet = Math.max(0, nextFeet);
    grounded = false;
  }
  player.model.group.position.set(player.pos.x, feet, player.pos.z);
  camera.position.set(
    player.pos.x,
    feet + (crouch ? 1.12 : 1.7) + (length && feet === 0 ? Math.sin(bob * 1.5) * 0.025 : 0),
    player.pos.z,
  );
  camera.rotation.set(pitch - recoil * 0.3, yaw, 0, 'YXZ');
  if (fireHeld) shoot();
}
function spectatorCamera(dt) {
  if (!multiplayerServer && combatFX.deathCamera(camera)) return;
  if (specTarget && !specTarget.alive)
    specTarget = actors.find((a) => a.team === myTeam() && a.alive) || null;
  if (specTarget) {
    camera.position.lerp(vec(specTarget.pos, 1.8), Math.min(1, dt * 12));
    const euler = new T.Euler(-0.04, specTarget.heading, 0, 'YXZ');
    camera.quaternion.slerp(new T.Quaternion().setFromEuler(euler), Math.min(1, dt * 8));
    specTarget.model.group.visible = false;
    for (const a of actors)
      if (!a.isPlayer && a !== specTarget && a.alive) a.model.group.visible = true;
  } else if (spike.planted) {
    camera.position.lerp(new T.Vector3(spike.pos.x + 6, 7, spike.pos.z + 7), dt * 2);
    camera.lookAt(vec(spike.pos, 1));
  }
}
function updateVisuals(dt) {
  for (const a of actors)
    if (!a.alive && a.model.imported) a.model.animate(false, worldTime, false, dt);
  recoil = Math.max(0, recoil - dt * 0.36);
  const w = WEAPONS[weapon().id],
    scoped = aim && !!w.scope && player?.alive;
  const targetFov = scoped ? 78 / w.scope : aim ? 59 : 78;
  camera.fov = T.MathUtils.lerp(camera.fov, targetFov, Math.min(1, dt * 14));
  camera.updateProjectionMatrix();
  $('scope').classList.toggle('hidden', !scoped);
  gun.visible = state !== 'menu' && player?.alive && !scoped;
  gunFlash.visible = gunFlash.visible && fireCooldown > w.rate - 0.045;
  gunFlash.rotation.z += dt * 20;
  const aiming = aim && !scoped;
  gun.position.x = T.MathUtils.lerp(gun.position.x, aiming ? 0.02 : 0.29, Math.min(1, dt * 14));
  gun.position.y = T.MathUtils.lerp(
    gun.position.y,
    (aiming ? -0.16 : -0.25) +
      (moving ? Math.sin(bob) * 0.009 : Math.sin(worldTime * 1.4) * 0.003) -
      recoil * 0.25,
    Math.min(1, dt * 14),
  );
  gun.position.z = -0.72 + recoil * 0.6;
  gun.rotation.y = T.MathUtils.lerp(gun.rotation.y, aiming ? -0.25 : 0, Math.min(1, dt * 14));
  gun.rotation.x = reloading > 0 ? -0.4 + Math.sin(reloading * 4) * 0.07 : recoil * 0.7;
  gun.rotation.z = reloading > 0 ? -0.35 : moving ? Math.sin(bob) * 0.012 : 0;
  $('crosshair').style.setProperty('--gap', `${5 + moving + spreadKick * 250}px`);
  $('crosshair').style.opacity = scoped ? '0' : aim ? '.5' : '1';
  hitTime = Math.max(0, hitTime - dt);
  $('hitmarker').style.opacity = hitTime > 0 ? '1' : '0';
  if (!multiplayerServer) combatFX.update(dt, camera, player);
  if (!player?.alive && specTarget && (!combatFX.death || combatFX.death.age >= 0.85))
    specTarget.model.group.visible = false;
  flashTime = Math.max(0, flashTime - dt);
  $('flash').style.opacity = flashTime;
  if (toastTime > 0) {
    toastTime -= dt;
    if (toastTime <= 0) hide('toast');
  }
  if (killConfirmTime > 0) {
    killConfirmTime -= dt;
    if (killConfirmTime <= 0) hide('kill-confirm');
  }
  for (const e of effects)
    if (e.type === 'slow')
      for (const a of actors)
        if (a.alive && a.team !== e.team && dist(a.pos, e.pos) < e.radius) a.slow = 0.2;
  for (const key of Object.keys(skillTimers)) skillTimers[key] = Math.max(0, skillTimers[key] - dt);
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.ttl -= dt;
    if (s.ttl <= 0) {
      scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mesh.material.dispose();
      shots.splice(i, 1);
    }
  }
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.ttl -= dt;
    if (e.type === 'smoke') {
      e.mesh.rotation.y += dt * 0.1;
      e.mesh.material.opacity = 0.75 * Math.min(1, e.ttl);
      e.mesh.scale.setScalar(1 + Math.sin(worldTime) * 0.025);
    } else if (['pulse', 'explosion', 'recon'].includes(e.type)) {
      e.mesh.scale.addScalar(dt * (e.type === 'explosion' ? 14 : e.type === 'recon' ? 25 : 4));
      e.mesh.material.opacity = Math.min(0.4, e.ttl * 0.4);
    } else if (e.type === 'fire') e.mesh.material.opacity = 0.5 + Math.sin(worldTime * 12) * 0.12;
    if (e.ttl <= 0) {
      if (e.type === 'wall') {
        world.obstacles.splice(world.obstacles.indexOf(e.mesh), 1);
        BLOCKS.splice(BLOCKS.indexOf(e.block), 1);
      }
      removeEffect(e);
      effects.splice(i, 1);
      dangerZones = dangerZones.filter((d) => d !== e);
    }
  }
  for (const zone of dangerZones)
    for (const a of actors)
      if (a.alive && a.team !== (zone.team ?? 0) && dist(a.pos, zone.pos) < zone.radius)
        damage(a, 32 * dt, zone.owner || player);
  if (spikeModel) {
    spikeModel.visible = spike.planted && ['live', 'end'].includes(state);
    if (spikeModel.visible) {
      spikeModel.children[1].rotation.y += dt * 2;
      spikeModel.children[1].position.y = 0.66 + Math.sin(worldTime * 4) * 0.035;
    }
  }
  if (dropModel) {
    dropModel.rotation.y += dt;
    dropModel.position.y = 0.45 + Math.sin(worldTime * 3) * 0.12;
  }
}
const mini = $('minimap').getContext('2d');
function drawMap(c = mini, detail = false) {
  c.save();
  c.scale(detail ? 800 / 240 : 1, detail ? 800 / 240 : 1);
  const size = 240,
    k = 210 / (MAP.halfWidth * 2),
    cx = 120,
    cz = 120;
  const map = (p) => [cx + p.x * k, cz + p.z * k];
  c.clearRect(0, 0, size, size);
  c.fillStyle = '#15232c';
  c.fillRect(15, 10, 210, 220);
  c.strokeStyle = '#49616b';
  c.lineWidth = 1;
  for (const b of BLOCKS) {
    if ((b.bottom || 0) > 1.8) continue;
    const [x, z] = map(b);
    c.fillStyle = b.buy ? '#72dbe8' : '#617075';
    c.fillRect(x - (b.w * k) / 2, z - (b.d * k) / 2, b.w * k, b.d * k);
    c.strokeRect(x - (b.w * k) / 2, z - (b.d * k) / 2, b.w * k, b.d * k);
  }
  for (const s of SITES) {
    const [x, z] = map(s);
    c.fillStyle = '#cfc48d20';
    c.fillRect(x - s.r * k, z - s.r * k, s.r * k * 2, s.r * k * 2);
    c.strokeStyle = '#cfc48d88';
    c.strokeRect(x - s.r * k, z - s.r * k, s.r * k * 2, s.r * k * 2);
    c.fillStyle = '#e8dda6';
    c.font = 'bold 14px Bahnschrift,Arial';
    c.textAlign = 'center';
    c.fillText(s.name, x, z + 5);
  }
  if (state === 'buy' && attackTeam === myTeam()) {
    c.setLineDash([3, 3]);
    for (const route of ROUTES[attackPlan]) {
      c.strokeStyle = '#8ce8d177';
      c.lineWidth = 1;
      c.beginPath();
      for (const [i, p] of route.points.entries()) {
        const [x, z] = map(p);
        if (i === 0) c.moveTo(x, z);
        else c.lineTo(x, z);
      }
      c.stroke();
    }
    c.setLineDash([]);
  }
  for (const a of actors) {
    if (!a.alive) continue;
    const visibleOnMap =
      a.team === myTeam() ||
      a.reveal > 0 ||
      actors.some((b) => b.team === myTeam() && b.alive && visible(b, a));
    if (!visibleOnMap) continue;
    const [x, z] = map(a.pos);
    c.fillStyle = a === player ? '#fff' : a.team === myTeam() ? '#84e6d2' : '#ff6777';
    c.beginPath();
    c.arc(x, z, a === player ? 4 : 3, 0, Math.PI * 2);
    c.fill();
    if (a === player) {
      c.strokeStyle = '#fff9';
      c.beginPath();
      c.moveTo(x, z);
      c.lineTo(x - Math.sin(yaw) * 12, z - Math.cos(yaw) * 12);
      c.stroke();
    }
  }
  const pos = spike.pos || spike.drop;
  if (pos) {
    const [x, z] = map(pos);
    c.strokeStyle = spike.planted ? '#ff7c86' : '#f8dea0';
    c.lineWidth = 2;
    c.strokeRect(x - 4, z - 4, 8, 8);
  }
  if (detail) {
    c.font = 'bold 3.6px Arial';
    c.textAlign = 'center';
    c.lineWidth = 1.3;
    for (const callout of CALLOUTS) {
      const [x, z] = map(callout);
      c.strokeStyle = '#15232c';
      c.fillStyle = '#eee6c8';
      c.strokeText(callout.text, x, z);
      c.fillText(callout.text, x, z);
    }
  }
  c.restore();
}
function drawScoreboard() {
  $('score-subtitle').textContent =
    'SANTA LUZ · ' + mode.size + ' × ' + mode.size + ' · ' + mode.name;
  let html =
    '<table><thead><tr><th>AGENTE</th><th>EQUIPE</th><th>ELIMINAÇÕES</th><th>MORTES</th><th>STATUS</th></tr></thead><tbody>';
  for (const a of actors) {
    html += `<tr class="${a === player ? 'own' : a.team !== myTeam() ? 'opponent' : ''} ${a.alive ? '' : 'dead'}"><td>${a.name}${a === player ? ' · VOCÊ' : ''}</td><td>${a.team === myTeam() ? 'SUA EQUIPE' : 'OPONENTES'}</td><td>${a.kills}</td><td>${a.deaths}</td><td>${a.alive ? 'EM CAMPO' : 'ELIMINADO'}</td></tr>`;
  }
  html += '</tbody></table>';
  $('score-table').innerHTML = html;
}

function update(dt) {
  worldTime += dt;
  world.animateBuy(worldTime);
  if (state === 'menu') {
    if (previewModel) {
      previewModel.group.visible = true;
      previewModel.group.rotation.y = Math.PI + 0.12 + Math.sin(worldTime * 0.5) * 0.08;
      previewModel.animate(false, worldTime, false, dt);
    }
    gun.visible = false;
    const a = Math.sin(worldTime * 0.055) * 0.13;
    camera.position.set(8 + Math.sin(worldTime * 0.06) * 2, 5.9, 36);
    camera.lookAt(-10 + a * 10, 2, 8);
    return;
  }
  if (state === 'match') return;
  if (onlineGame) {
    updateOnlineView(dt);
    return;
  }
  if (paused) return;
  for (const a of actors) {
    for (const key of ['slow', 'stim', 'disarmed', 'resist'])
      a[key] = Math.max(0, (a[key] || 0) - dt);
  }
  if (!shopOpen && !tacticalOpen && (locked || freeMouse)) {
    if (state === 'buy' || state === 'live' || state === 'end') updatePlayer(dt);
  } else moving = 0;
  if (!player.alive) spectatorCamera(dt);
  if (state === 'buy') {
    updateObjective(dt);
    clock -= dt;
    if (clock <= 0) beginRound();
  } else if (state === 'live') {
    phaseTime += dt;
    updateBots(dt);
    if (state === 'live') updateObjective(dt);
    if (state === 'live' && !spike.planted) {
      clock -= dt;
      if (clock <= 0) finishRound(1 - attackTeam, 'Tempo esgotado');
    }
  } else if (state === 'end') {
    clock -= dt;
    if (clock <= 0) {
      if (matchWinner(score, mode) !== null) endMatch();
      else {
        round++;
        if (spikeModel) spikeModel.visible = false;
        clearDrop();
        newRound();
      }
    }
  }
  updateVisuals(dt);
  const timer = spike.planted && state === 'live' ? spike.time : clock;
  const seconds = Math.max(0, Math.ceil(timer));
  $('timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  $('timer').parentElement.classList.toggle('planted', spike.planted && state === 'live');
  if (player) {
    const s = SITES.find((s) => dist(player.pos, s) < s.r + 2);
    $('location').textContent = s ? 'PONTO ' + s.name : world.zone(player.pos);
  }
  updateObjectivePanel();
  drawMap();
  if (tacticalOpen) drawMap(tactical, true);
}
let previous = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  try {
    audio?.update(camera.position, camera.rotation.y, settings.volume);
    update(dt);
    renderer.render(scene, camera);
  } catch (e) {
    console.error(e);
    paused = true;
    hide('loading');
    $('fatal-message').textContent = 'O jogo encontrou um erro: ' + e.message;
    show('fatal');
  }
}

// User input is captured only while the arena owns the mouse.
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === $('game');
  if (locked) {
    freeMouse = false;
    hide('free-mouse-hint');
    hide('pause');
    paused = false;
    allowUnlock = false;
  } else {
    resetInput();
    if (!allowUnlock && !freeMouse && !shopOpen && state !== 'menu' && state !== 'match')
      showPause();
    allowUnlock = false;
  }
});
document.addEventListener('pointerlockerror', mouseFallback);
document.addEventListener('mousemove', (e) => {
  if ((!locked && !(freeMouse && aim)) || paused || !player?.alive || shopOpen || tacticalOpen)
    return;
  const sens = 0.002 * settings.sensitivity * (aim ? 0.6 : 1);
  yaw -= e.movementX * sens;
  pitch = clamp(pitch - e.movementY * sens, -1.45, 1.45);
});
document.addEventListener('mousedown', (e) => {
  if (
    (!locked && !freeMouse) ||
    paused ||
    shopOpen ||
    tacticalOpen ||
    state === 'menu' ||
    state === 'match'
  )
    return;
  if (e.button === 0) {
    fireHeld = true;
    semiLatch = false;
    shoot();
  }
  if (e.button === 2) setAim(true);
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    fireHeld = false;
    semiLatch = false;
  }
  if (e.button === 2) setAim(false);
});
document.addEventListener('contextmenu', (e) => {
  if (state !== 'menu') e.preventDefault();
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input,select')) return;
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code) && state !== 'menu')
    e.preventDefault();
  if (e.code === 'Escape') {
    if (tacticalOpen) {
      toggleTactical();
      return;
    }
    if (shopOpen) closeShop();
    else if (paused) resume();
    else if (!locked && state !== 'menu' && state !== 'match') showPause();
    return;
  }
  if (e.repeat) return;
  if (e.code === 'KeyM' && !paused && !shopOpen && ['buy', 'live', 'end'].includes(state)) {
    toggleTactical();
    return;
  }
  if (tacticalOpen) return;
  if (e.code === 'KeyB' && !paused && ['buy', 'live'].includes(state)) {
    if (shopOpen) closeShop();
    else openShop();
    return;
  }
  if (e.code === 'Enter' && state === 'buy' && !paused) {
    beginRound();
    if (!locked) capture();
    return;
  }
  if (state === 'menu' || state === 'match' || paused || shopOpen) return;
  if (e.code === 'Tab') {
    drawScoreboard();
    show('scoreboard');
    return;
  }
  keys.add(e.code);
  if (e.code === 'KeyG') dropSpike();
  if (e.code === 'KeyZ') cyclePlan();
  if (e.code === 'KeyR') reload();
  if (e.code === 'Digit1') changeWeapon(1);
  if (e.code === 'Digit2') changeWeapon(2);
  if (e.code === 'Digit3') changeWeapon(3);
  for (const [i, code] of ['KeyQ', 'KeyE', 'KeyC', 'KeyX'].entries()) if (e.code === code) skill(i);
});
document.addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'Tab') hide('scoreboard');
});
window.addEventListener('blur', () => {
  resetInput();
  if (started && state !== 'menu' && state !== 'match' && !shopOpen) showPause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state !== 'menu' && state !== 'match') showPause();
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
$('play').onclick = startMatch;
$('again').onclick = startMatch;
$('restart').onclick = startMatch;
$('resume').onclick = resume;
$('quit').onclick = returnMenu;
$('end-menu').onclick = returnMenu;
$('close-shop').onclick = () => closeShop();
$('ready').onclick = () => {
  beginRound();
  capture();
};
$('light-armor').onclick = () => buyArmor(25, 400);
$('heavy-armor').onclick = () => buyArmor(50, 1000);
$('help-btn').onclick = () => $('help').showModal();
$('close-help').onclick = () => $('help').close();
function saveSettings() {
  try {
    localStorage.setItem('rupture-settings', JSON.stringify(settings));
  } catch {}
}
$('sensitivity').value = settings.sensitivity;
$('sens-value').textContent = Number(settings.sensitivity).toFixed(1);
$('volume').value = settings.volume;
$('quality').value = settings.quality;
$('sensitivity').oninput = (e) => {
  settings.sensitivity = Number(e.target.value);
  $('sens-value').textContent = settings.sensitivity.toFixed(1);
  saveSettings();
};
$('volume').oninput = (e) => {
  settings.volume = Number(e.target.value);
  saveSettings();
};
function quality() {
  renderer.setPixelRatio(settings.quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = settings.quality !== 'low';
  renderer.setSize(innerWidth, innerHeight);
}
quality();
$('quality').onchange = (e) => {
  settings.quality = e.target.value;
  quality();
  saveSettings();
};
window.addEventListener('error', (e) => {
  if (e.message?.includes('WebGL')) {
    $('fatal-message').textContent = e.message;
    hide('loading');
    show('fatal');
  }
});
drawModes();
drawAgents();
buildGun();
gun.visible = false;
hide('loading');
show('menu');
if (assetReport.failed.length || environmentReport.failed)
  toast('Alguns modelos não carregaram. O jogo iniciou com os visuais alternativos.');
requestAnimationFrame(frame);

// Both the online server and solo mode use the same collisions, guns and rules.
let netSequence = 0,
  netReady = new Set(),
  networkFeed = [],
  networkSounds = [];
function humanState() {
  return {
    primary,
    pistol,
    slot,
    credits,
    ult,
    skills,
    skillTimers,
    yaw,
    pitch,
    vertical,
    feet,
    grounded,
    moving,
    footTimer,
    bob,
    recoil,
    spreadKick,
    fireCooldown,
    reloading,
    aim,
    fireHeld,
    semiLatch,
    interactProgress,
    kills,
    deaths,
    headshots,
    roundKills,
  };
}
function loadHuman(h) {
  ({
    primary,
    pistol,
    slot,
    credits,
    ult,
    skills,
    skillTimers,
    yaw,
    pitch,
    vertical,
    feet,
    grounded,
    moving,
    footTimer,
    bob,
    recoil,
    spreadKick,
    fireCooldown,
    reloading,
    aim,
    fireHeld,
    semiLatch,
    interactProgress,
    kills,
    deaths,
    headshots,
    roundKills,
  } = h);
}
function withHuman(a, fn) {
  player = a;
  agents = a.agent;
  loadHuman(a.netData);
  keys.clear();
  const input = a.input || {};
  for (const key of input.keys || []) keys.add(key);
  yaw = input.yaw ?? yaw;
  pitch = input.pitch ?? pitch;
  aim = !!input.aim;
  if (!input.fire) semiLatch = false;
  fireHeld = !!input.fire;
  shopOpen = false;
  paused = false;
  freeMouse = true;
  camera.position.set(a.pos.x, feet + (keys.has('ControlLeft') ? 1.12 : 1.7), a.pos.z);
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  camera.updateMatrixWorld(true);
  fn();
  a.heading = yaw;
  a.netData = humanState();
}
function freshHuman(a, reset = 800) {
  const old = a.netData;
  a.netData = {
    primary: null,
    pistol: { id: 'pulse', ammo: 12, reserve: 48 },
    slot: 2,
    credits: reset,
    ult: 0,
    skills: a.agent.skills.slice(0, 3).map((s) => s.charges),
    skillTimers: {},
    yaw: a.team === attackTeam ? 0 : Math.PI,
    pitch: 0,
    vertical: 0,
    feet: 0,
    grounded: true,
    moving: 0,
    footTimer: 0,
    bob: 0,
    recoil: 0,
    spreadKick: 0,
    fireCooldown: 0,
    reloading: 0,
    aim: false,
    fireHeld: false,
    semiLatch: false,
    interactProgress: 0,
    kills: a.kills,
    deaths: a.deaths,
    headshots: 0,
    roundKills: 0,
  };
  if (old) {
    a.netData.ult = old.ult;
    a.netData.headshots = old.headshots;
    if (!reset) {
      a.netData.credits = old.credits;
      if (a.survived) {
        a.netData.primary = old.primary;
        a.netData.pistol = old.pistol;
        a.netData.slot = old.slot;
      }
    }
  }
  for (const w of [a.netData.primary, a.netData.pistol].filter(Boolean)) {
    w.ammo = WEAPONS[w.id].mag;
    w.reserve = WEAPONS[w.id].reserve;
  }
  a.input = { keys: [], yaw: a.netData.yaw, pitch: 0 };
  a.actions = [];
  a.model.group.visible = true;
}
function rewardHumans(winner) {
  for (const a of actors)
    if (a.netData && a !== player) {
      a.netData.credits = Math.min(
        9000,
        a.netData.credits +
          (a.team === winner ? 3000 : Math.min(1900 + (teamLosses[a.team] - 1) * 500, 2900)),
      );
      a.netData.ult = Math.min(6, a.netData.ult + 1);
    }
}
function networkNewRound() {
  const humans = actors.filter((a) => a.netData);
  for (const a of humans) a.survived = a.alive;
  withHuman(humans[0], () => newRound());
  netReady.clear();
  const reset =
    round === 0 || round === mode.half ? 800 : mode.id === 'competitive' && round >= 24 ? 5000 : 0;
  for (const a of humans) {
    if (reset || !a.survived) a.armor = 0;
    freshHuman(a, reset);
  }
  spike.carrier =
    actors.find((a) => a.team === attackTeam && a.netData) ||
    actors.find((a) => a.team === attackTeam);
}
export const networkEngine = {
  start(roster, options = {}) {
    multiplayerServer = true;
    (networkFeed = []), (networkSounds = []);
    mode = MODES[options.mode] || MODES.quick;
    selectedMode = mode.id;
    round = 0;
    score = [0, 0];
    teamLosses = [0, 0];
    for (const a of actors) disposeActor(a);
    actors = [];
    for (const member of roster) {
      const a = makeActor(
        member.team,
        actors.filter((b) => b.team === member.team).length,
        true,
        AGENTS.find((g) => g.id === member.agent) || AGENTS[0],
      );
      a.id = member.id;
      a.name = member.name;
      actors.push(a);
      freshHuman(a);
    }
    if (options.bots)
      for (let team = 0; team < 2; team++) {
        while (actors.filter((a) => a.team === team).length < mode.size) {
          const a = makeActor(team, actors.filter((b) => b.team === team).length);
          a.id = 'bot-' + actors.length;
          actors.push(a);
        }
      }
    started = true;
    networkNewRound();
  },
  input(id, input) {
    const a = actors.find((a) => a.id === id && a.netData);
    if (!a) return;
    a.input = input;
    a.inputAt = worldTime;
    a.connected = true;
  },
  command(id, action, value) {
    const a = actors.find((a) => a.id === id && a.netData);
    if (a && a.actions.length < 24) a.actions.push([action, value]);
  },
  disconnect(id) {
    const a = actors.find((a) => a.id === id);
    if (a) {
      a.input = { keys: [], yaw: a.heading };
      a.actions = [];
      a.connected = false;
    }
  },
  tick(dt) {
    if (state === 'match') return;
    worldTime += dt;
    for (const a of actors) {
      for (const k of ['slow', 'stim', 'disarmed', 'resist', 'blind', 'reveal'])
        a[k] = Math.max(0, (a[k] || 0) - dt);
      a.muzzleTime = Math.max(0, (a.muzzleTime || 0) - dt);
    }
    for (const a of actors.filter((a) => a.netData)) {
      if (worldTime - (a.inputAt || 0) > 0.5) a.input = { keys: [], yaw: a.heading };
      withHuman(a, () => {
        for (const [cmd, val] of a.actions.splice(0)) {
          if (cmd === 'buy' && world.inBuyZone(a.pos, a.team === attackTeam)) {
            shopOpen = true;
            buyWeapon(val);
            shopOpen = false;
          } else if (
            cmd === 'armor' &&
            [25, 50].includes(val) &&
            world.inBuyZone(a.pos, a.team === attackTeam)
          ) {
            shopOpen = true;
            buyArmor(val, val === 25 ? 400 : 1000);
            shopOpen = false;
          } else if (cmd === 'slot' && [1, 2, 3].includes(val)) changeWeapon(val);
          else if (cmd === 'reload') reload();
          else if (cmd === 'skill' && Number.isInteger(val) && val >= 0 && val < 4) skill(val);
          else if (cmd === 'drop') dropSpike();
          else if (cmd === 'plan') cyclePlan();
          else if (cmd === 'ready' && state === 'buy') netReady.add(a.id);
        }
        if (['buy', 'live'].includes(state)) {
          updatePlayer(dt);
          scene.updateMatrixWorld(true);
          updateObjective(dt, false);
        }
        for (const k of Object.keys(skillTimers)) skillTimers[k] = Math.max(0, skillTimers[k] - dt);
        recoil = Math.max(0, recoil - dt * 0.36);
      });
    }
    if (state === 'buy') {
      updateObjective(dt, true, false);
      clock -= dt;
      if (
        clock <= 0 ||
        actors.filter((a) => a.netData && a.connected !== false).every((a) => netReady.has(a.id))
      )
        beginRound();
    } else if (state === 'live') {
      phaseTime += dt;
      updateBots(dt);
      if (state === 'live') updateObjective(dt, true, false);
      if (state === 'live' && !spike.planted) {
        clock -= dt;
        if (clock <= 0) finishRound(1 - attackTeam, 'Tempo esgotado');
      }
    } else if (state === 'end') {
      clock -= dt;
      if (clock <= 0) {
        if (matchWinner(score, mode) !== null) state = 'match';
        else {
          round++;
          networkNewRound();
          return;
        }
      }
    }
    // Effects and area damage advance exactly once per simulation step.
    const timers = skillTimers,
      savedRecoil = recoil;
    skillTimers = {};
    updateVisuals(dt);
    skillTimers = timers;
    recoil = savedRecoil;
    if (player?.netData) player.netData = humanState();
    scene.updateMatrixWorld(true);
  },
  snapshot(id) {
    const own = actors.find((a) => a.id === id),
      h = own?.netData;
    const serialEffect = (e) => ({
      id: (e.netId ||= ++netSequence),
      type: e.type,
      ttl: e.ttl,
      radius: e.radius,
      pos: e.mesh.position.toArray(),
      scale: e.mesh.scale.toArray(),
      color: e.mesh.material.color?.getHex(),
      block: e.block,
    });
    return {
      state,
      round,
      score: [...score],
      attackTeam,
      clock,
      mode: mode.id,
      attackPlan,
      actors: actors.map((a) => ({
        id: a.id,
        name: a.name,
        agent: a.agent.id,
        team: a.team,
        weapon: a.netData
          ? a.netData.slot === 1
            ? a.netData.primary?.id
            : a.netData.slot === 3
              ? 'knife'
              : a.netData.pistol.id
          : a.weaponId,
        human: !!a.netData,
        alive: a.alive,
        hp: a.hp,
        armor: a.armor,
        pos: { ...a.pos },
        heading: a.heading,
        feet: a.netData?.feet || 0,
        moving: a.netData?.moving || 0,
        kills: a.kills,
        deaths: a.deaths,
        blind: a.blind,
        reveal: a.reveal,
        muzzle: a.muzzleTime > 0,
        connected: a.connected !== false,
        impact: a.lastImpact && worldTime - a.lastImpact.at < 1.2 ? a.lastImpact : null,
      })),
      own: h ? JSON.parse(JSON.stringify({ ...h, kills: own.kills, deaths: own.deaths })) : null,
      feed: networkFeed,
      audio: networkSounds.filter((event) => worldTime - event.at < 0.35),
      spike: {
        planted: spike.planted,
        carrier: spike.carrier?.id || null,
        drop: spike.drop,
        pos: spike.pos,
        time: spike.time,
        site: spike.site,
        defuseFloor: spike.defuseFloor,
        reason: spike.reason,
        outcome: spike.outcome,
      },
      effects: effects.filter((e) => e.type !== 'spark').map(serialEffect),
      shots: shots.map((s) => ({
        id: (s.netId ||= ++netSequence),
        points: Array.from(s.mesh.geometry.attributes.position.array),
      })),
    };
  },
};

let lastOnlineState = '',
  lastOnlineRound = -1,
  onlineEffects = new Map(),
  seenShots = new Set(),
  lastFeedId = 0,
  lastSoundId = 0;
function receiveOnline(snapshot, id) {
  networkViewTeam = snapshot.actors.find((a) => a.id === id)?.team ?? 0;
  if (!onlineGame) {
    onlineGame = true;
    started = true;
    clearEffects();
    clearDrop();
    for (const a of actors) disposeActor(a);
    actors = [];
    if (previewModel) previewModel.group.visible = false;
    hide('menu');
    hide('online');
    hide('match-end');
    show('hud');
    lastOnlineState = '';
    lastOnlineRound = -1;
    onlineEffects = new Map();
    seenShots = new Set();
    (lastFeedId = 0), (lastSoundId = 0);
    capture();
  }
  mode = MODES[snapshot.mode];
  const roundChanged = round !== snapshot.round || lastOnlineRound < 0;
  if (roundChanged) combatFX.reset();
  round = snapshot.round;
  score = snapshot.score;
  attackTeam = snapshot.attackTeam;
  clock = snapshot.clock;
  attackPlan = snapshot.attackPlan;
  for (const data of snapshot.actors) {
    let a = actors.find((a) => a.id === data.id);
    if (!a) {
      a = makeActor(
        data.team,
        0,
        false,
        AGENTS.find((g) => g.id === data.agent),
      );
      a.id = data.id;
      actors.push(a);
    }
    const wasAlive = a.alive,
      wasReceived = a.received;
    Object.assign(a, {
      name: data.name,
      team: data.team,
      alive: data.alive,
      hp: data.hp,
      armor: data.armor,
      kills: data.kills,
      deaths: data.deaths,
      heading: data.heading,
      blind: data.blind,
      reveal: data.reveal,
    });
    a.targetPos = { ...data.pos };
    a.netWeapon = data.weapon;
    a.netFeet = data.feet;
    a.netMoving = data.moving;
    a.isPlayer = data.id === id;
    if (roundChanged || !a.received) {
      a.pos = { ...data.pos };
      a.received = true;
    }
    a.model.group.visible = !a.isPlayer;
    if (roundChanged || wasAlive !== a.alive) a.model.setAlive?.(a.alive);
    if (!a.model.imported) a.model.group.rotation.z = a.alive ? 0 : Math.PI / 2;
    if (!roundChanged && data.impact && data.impact.seq !== (a.lastImpactSeq || 0)) {
      a.lastImpactSeq = data.impact.seq;
      combatFX.impact(a, data.impact);
      if (a.isPlayer) combatFX.hurt(a.pos, data.impact.from, data.impact.amount);
    }
    if (!roundChanged && wasReceived && wasAlive && !a.alive) {
      combatFX.eliminate(a);
      if (a.isPlayer)
        combatFX.die({ ...a.pos, y: data.feet }, yaw, data.impact?.attacker || 'AMBIENTE');
    }
    a.model.muzzle.visible = data.muzzle;
    if (a.isPlayer) player = a;
  }
  const previousWeapon = weapon().id,
    oldAmmo = weapon().ammo,
    oldKills = player.kills;
  if (snapshot.own) {
    const localYaw = yaw,
      localPitch = pitch,
      localAim = aim,
      localFire = fireHeld;
    loadHuman(snapshot.own);
    if (!roundChanged) {
      yaw = localYaw;
      pitch = localPitch;
    }
    aim = localAim;
    fireHeld = localFire;
    if (roundChanged) resetInput();
  }
  agents = player.agent;
  if (previousWeapon !== weapon().id || roundChanged) buildGun();
  if (weapon().ammo < oldAmmo && !roundChanged) {
    recoil = 0.06;
    gunFlash.visible = true;
  }
  const wasPlanted = spike.planted;
  spike = {
    ...snapshot.spike,
    carrier: actors.find((a) => a.id === snapshot.spike.carrier) || null,
  };
  if (spike.planted && (!wasPlanted || !spikeModel || lastOnlineRound !== round)) makeSpikeModel();
  if (spike.drop) {
    if (!dropModel) makeDrop();
    else dropModel.position.set(spike.drop.x, 0.45, spike.drop.z);
  } else clearDrop();
  for (const e of snapshot.effects) {
    let effect = onlineEffects.get(e.id);
    if (!effect) {
      if (e.type === 'wall') {
        const mesh = new T.Mesh(
          new T.BoxGeometry(e.block.w, e.block.h, e.block.d),
          new T.MeshStandardMaterial({ color: e.color, transparent: true, opacity: 0.85 }),
        );
        scene.add(mesh);
        effect = { mesh, type: e.type, block: e.block };
        world.obstacles.push(mesh);
        BLOCKS.push(e.block);
        effects.push(effect);
      } else if (['fire', 'slow'].includes(e.type)) {
        const mesh = new T.Mesh(
          new T.CylinderGeometry(e.radius, e.radius, 0.06, 24),
          new T.MeshBasicMaterial({ color: e.color, transparent: true, opacity: 0.5 }),
        );
        scene.add(mesh);
        effect = { mesh, type: e.type };
        effects.push(effect);
      } else effect = effectSphere(new T.Vector3(...e.pos), e.radius || 1, e.color, e.ttl, e.type);
      onlineEffects.set(e.id, effect);
    }
    effect.mesh.position.fromArray(e.pos);
    effect.mesh.scale.fromArray(e.scale);
    effect.ttl = e.ttl;
  }
  const active = new Set(snapshot.effects.map((e) => e.id));
  for (const [id, e] of onlineEffects)
    if (!active.has(id)) {
      if (e.block) {
        const bi = BLOCKS.indexOf(e.block),
          oi = world.obstacles.indexOf(e.mesh);
        if (bi >= 0) BLOCKS.splice(bi, 1);
        if (oi >= 0) world.obstacles.splice(oi, 1);
      }
      removeEffect(e);
      onlineEffects.delete(id);
      effects = effects.filter((x) => x !== e);
    }
  for (const shot of snapshot.shots)
    if (!seenShots.has(shot.id)) {
      seenShots.add(shot.id);
      tracer(new T.Vector3(...shot.points.slice(0, 3)), new T.Vector3(...shot.points.slice(3, 6)));
      if (seenShots.size > 300) seenShots.delete(seenShots.values().next().value);
    }
  for (const event of snapshot.feed || [])
    if (event.id > lastFeedId) {
      const attacker = actors.find((a) => a.id === event.attacker),
        target = actors.find((a) => a.id === event.target);
      if (target) feed(attacker, target, event.head);
      if (attacker === player) {
        hitTime = 0.2;
        killConfirmTime = 1.5;
        $('kill-confirm-text').textContent = event.head ? 'TIRO NA CABEÇA' : 'ELIMINAÇÃO';
        show('kill-confirm');
      }
      lastFeedId = event.id;
    }
  for (const event of snapshot.audio || [])
    if (event.id > lastSoundId) {
      lastSoundId = event.id;
      if (event.to && event.to !== id) continue;
      const type =
        event.type === 'round'
          ? Number(event.variant) === player.team
            ? 'roundWin'
            : 'roundLoss'
          : event.type;
      sound(type, event.volume, event.position, event.variant);
    }
  state = snapshot.state;
  if (state !== lastOnlineState) world.setBuyPhase(state === 'buy');
  if (state !== lastOnlineState || roundChanged) {
    if (state !== 'buy' && shopOpen) closeShop(false);
    $('phase-title').textContent =
      state === 'buy' ? 'FASE DE COMPRA' : state === 'end' ? 'ROUND ENCERRADO' : '';
    $('phase-small').textContent =
      `ROUND ${round + 1} · ${player.team === attackTeam ? 'ATAQUE' : 'DEFESA'}`;
    $('phase-sub').textContent =
      state === 'buy'
        ? 'B · Comprar / Enter · Pronto (todos precisam confirmar)'
        : spike.reason || '';
    $('phase-banner').classList.toggle('hidden', !['buy', 'end'].includes(state));
    if (state === 'match') endMatch();
  }
  lastOnlineState = state;
  lastOnlineRound = round;
  gun.visible = player.alive;
  $('spectator').classList.toggle('hidden', player.alive);
  specTarget = actors.find((a) => a.team === player.team && a.alive && a !== player) || null;
  refreshHUD();
  if (shopOpen) drawShop();
}
function updateOnlineView(dt) {
  for (const a of actors) {
    if (!a.targetPos) continue;
    const k = 1 - Math.exp(-dt * 22);
    a.pos.x += (a.targetPos.x - a.pos.x) * k;
    a.pos.z += (a.targetPos.z - a.pos.z) * k;
    a.model.group.position.set(a.pos.x, a.netFeet || 0, a.pos.z);
    a.model.group.rotation.y = a.heading;
    a.walking += dt * (a.netMoving || 0) * 2;
    a.model.setWeapon?.(a.netWeapon || 'pulse');
    if (a.alive) a.model.animate(a.netMoving > 0, a.walking, false, dt);
    a.model.badge.visible =
      a.alive && (a.team === player.team || a.reveal > 0 || visible(player, a));
  }
  if (player.alive) {
    camera.position.set(player.pos.x, feet + (keys.has('ControlLeft') ? 1.12 : 1.7), player.pos.z);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  } else spectatorCamera(dt);
  // Client effects are visual; only the server applies their damage and expiry.
  const keep = effects,
    zones = dangerZones;
  effects = [];
  dangerZones = [];
  updateVisuals(dt);
  effects = keep;
  dangerZones = zones;
  flashTime = player.blind > 0 ? Math.min(1, player.blind) : 0;
  if (spikeModel) spikeModel.visible = spike.planted && ['live', 'end'].includes(state);
  const seconds = Math.max(0, Math.ceil(spike.planted && state === 'live' ? spike.time : clock));
  $('timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  $('timer').parentElement.classList.toggle('planted', spike.planted && state === 'live');
  $('location').textContent = world.zone(player.pos);
  const canPlant =
    player.team === attackTeam &&
    spike.carrier === player &&
    SITES.some((s) => dist(s, player.pos) < s.r);
  const canDefuse =
    player.team !== attackTeam && spike.planted && dist(player.pos, spike.pos) < 2.8;
  $('interaction').classList.toggle(
    'hidden',
    !player.alive || state !== 'live' || !(canPlant || canDefuse),
  );
  $('interaction-text').textContent = canDefuse
    ? 'Segure para desarmar a spike'
    : 'Segure para plantar a spike';
  $('interaction-progress').style.width =
    `${(100 * interactProgress) / (canDefuse ? mode.defuse : mode.plant)}%`;
  $('objective').textContent = spike.planted
    ? `SPIKE PLANTADA · ${spike.site}`
    : spike.carrier === player
      ? 'VOCÊ CARREGA A SPIKE · F PARA PLANTAR'
      : '';
  updateObjectivePanel();
  drawMap();
  if (tacticalOpen) drawMap(tactical, true);
}
onlineClient = setupOnline({
  receive: receiveOnline,
  menu: () => {
    onlineGame = false;
    returnMenu();
  },
  input: () => ({
    keys: paused || shopOpen || tacticalOpen ? [] : [...keys],
    yaw,
    pitch,
    fire: !paused && !shopOpen && !tacticalOpen && fireHeld,
    aim: !paused && !shopOpen && !tacticalOpen && aim,
  }),
  agent: () => AGENTS[chosen].id,
  toast,
});
