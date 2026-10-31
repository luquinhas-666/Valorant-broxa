import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
class Element {
  constructor() {
    this.children = [];
    this.style = { setProperty() {} };
    this.classList = { add() {}, remove() {}, toggle() {} };
    this.value = '';
    this.disabled = false;
  }
  getContext() {
    return new Proxy(
      {},
      {
        get: (_, key) =>
          key === 'measureText'
            ? () => ({ width: 100 })
            : /Gradient$/.test(key)
              ? () => ({ addColorStop() {} })
              : () => {},
      },
    );
  }
  append(...c) {
    for (const child of c) {
      child.parentElement = this;
      this.children.push(child);
    }
  }
  appendChild(c) {
    this.append(c);
  }
  remove() {
    if (this.parentElement?.children)
      this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
  }
  setAttribute() {}
  addEventListener() {}
  matches() {
    return false;
  }
  showModal() {}
  close() {}
  get firstChild() {
    return this.children[0];
  }
  set innerHTML(s) {
    this._html = s;
    this.children = [];
  }
  get innerHTML() {
    return this._html || '';
  }
}
Element.prototype.parentElement = { classList: { toggle() {} } };
const els = new Map(),
  document = {
    getElementById(id) {
      if (!els.has(id)) els.set(id, new Element());
      return els.get(id);
    },
    createElement() {
      return new Element();
    },
    addEventListener() {},
    exitPointerLock() {},
  };
class FakeRenderer {
  constructor() {
    this.capabilities = { getMaxAnisotropy: () => 8 };
    this.shadowMap = {};
  }
  setSize() {}
  setPixelRatio() {}
  render() {}
}
const ctx = vm.createContext({
  console,
  document,
  FakeRenderer,
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  performance,
  setTimeout() {},
  requestAnimationFrame() {},
  localStorage: {
    getItem() {
      return null;
    },
    setItem() {},
  },
  window: { addEventListener() {} },
  Math,
  URL,
  Float32Array,
  Uint32Array,
  Uint16Array,
  Int32Array,
  Uint8Array,
  ArrayBuffer,
  TextDecoder,
  TextEncoder,
});
const cache = new Map();
async function load(file) {
  if (cache.has(file)) return cache.get(file);
  let src = await fs.readFile(file, 'utf8');
  if (file.endsWith('game.js')) {
    src = src.replace(/new T.WebGLRenderer\(\{[\s\S]*?\}\)/, 'new FakeRenderer()');
    src += `\nexport const test={setMode:id=>{selectedMode=id;mode=MODES[id];},plant,dropSpike,cyclePlan,chooseGoal,shoot,startMatch,openShop,buyWeapon,buyArmor,beginRound,updateObjective,newRound,finishRound,damage,skill,changeWeapon,reload,updatePlayer,clearEffects,world,actors:()=>actors, player:()=>player, keys, snapshot:()=>({state,score,round,attackTeam,credits,spike,skills,ult,primary,pistol,slot,effects,mode,attackPlan,feet}),setRound:n=>round=n,setCredits:n=>credits=n,setPlayer:(p)=>Object.assign(player.pos,p),setUltimate:n=>ult=n,setChosen:n=>chosen=n,tick:dt=>{scene.updateMatrixWorld(true);update(dt);scene.updateMatrixWorld(true);}};`;
  }
  const m = new vm.SourceTextModule(src, { context: ctx, identifier: file });
  cache.set(file, m);
  await m.link((spec) => load(path.resolve(path.dirname(file), spec)));
  return m;
}
const game = await load(path.join(root, 'game.js'));
await game.evaluate();
const g = game.namespace.test;
let count = 0;
function check(name, fn) {
  fn();
  count++;
  console.log('PASS', name);
}
g.setMode('quick');
g.startMatch();
check('Partida inicia com 6 agentes, 800 créditos e fase de compra', () => {
  assert.equal(g.actors().length, 6);
  assert.equal(g.snapshot().credits, 800);
  assert.equal(g.snapshot().state, 'buy');
});
g.openShop();
g.buyWeapon('marshal');
check('Compra sem saldo é recusada', () => assert.equal(g.snapshot().primary, null));
g.buyArmor(25, 400);
check('Compra de escudo desconta créditos e aplica proteção', () => {
  assert.equal(g.snapshot().credits, 400);
  assert.equal(g.player().armor, 25);
});
g.buyArmor(50, 1000);
check('Proteção pesada não pode ser comprada sem saldo', () => assert.equal(g.player().armor, 25));
g.setCredits(4000);
g.buyWeapon('marshal');
check('Arma comprada tem carregador, reserva e desconto corretos', () => {
  assert.equal(g.snapshot().primary.ammo, 25);
  assert.equal(g.snapshot().primary.reserve, 75);
  assert.equal(g.snapshot().credits, 1300);
});
g.beginRound();
g.setPlayer({ x: -19, z: -10 });
g.keys.add('KeyF');
g.updateObjective(3.1);
check('Segurar F no ponto planta a spike e concede recompensa', () => {
  assert.equal(g.snapshot().spike.planted, true);
  assert.equal(g.snapshot().spike.site, 'A');
  assert.equal(g.snapshot().credits, 1600);
});
g.keys.clear();
g.updateObjective(36);
check('Detonação encerra round a favor do ataque', () => {
  assert.equal(g.snapshot().state, 'end');
  assert.equal(g.snapshot().score[0], 1);
});
g.setRound(3);
g.newRound();
check('Terceiro round concluído provoca troca para defesa', () => {
  assert.equal(g.snapshot().attackTeam, 1);
  assert.equal(g.snapshot().spike.carrier.team, 1);
  assert.equal(g.player().hp, 100);
});
g.beginRound();
const carrier = g.snapshot().spike.carrier;
carrier.pos = { x: 19, z: -10 };
carrier.plant = 0;
for (const a of g.actors().filter((a) => a.team === 0)) {
  a.pos = { x: 0, z: 28 };
  a.blind = 20;
} // Uncontested plant through the real simulation.
for (const a of g.actors()) if (a !== carrier && !a.isPlayer) a.blind = 20;
for (let i = 0; i < 100; i++) g.tick(0.05);
check('Bot atacante planta spike ao conquistar o ponto', () =>
  assert.equal(g.snapshot().spike.planted, true),
);
g.player().alive = true;
g.player().hp = 100;
g.setPlayer({ ...g.snapshot().spike.pos });
g.keys.add('KeyF');
g.updateObjective(5.1);
check('Defensor pode desarmar e vencer o round', () => {
  assert.equal(g.snapshot().state, 'end');
  assert.equal(g.snapshot().score[0], 2);
});
g.keys.clear();
g.newRound();
g.beginRound();
const before = g.snapshot().skills[1];
g.skill(1);
check('Névoa consome carga e cria efeito real no campo', () => {
  assert.equal(g.snapshot().skills[1], before - 1);
  assert.ok(g.snapshot().effects.some((e) => e.type === 'smoke'));
});
g.setChosen(2);
g.startMatch();
g.beginRound();
const blockCount = (await load(path.join(root, 'world.js'))).namespace.BLOCKS.length;
g.skill(2);
check('Barreira cria obstáculo físico', () =>
  assert.equal(cache.get(path.join(root, 'world.js')).namespace.BLOCKS.length, blockCount + 1),
);
g.newRound();
check('Novo round remove obstáculos temporários', () =>
  assert.equal(
    cache.get(path.join(root, 'world.js')).namespace.BLOCKS.filter((b) => !b.buy).length,
    blockCount,
  ),
);
g.beginRound();
g.player().armor = 50;
const hp = g.player().hp;
g.damage(g.player(), 40, g.actors()[3]);
check('Escudo absorve parte do dano', () => {
  assert.equal(g.player().armor, 24);
  assert.equal(g.player().hp, hp - 14);
});
g.setRound(0);
g.newRound();
g.beginRound();
g.damage(g.player(), 1000, g.actors()[3]);
check('Morte derruba spike para recuperação pela equipe', () => {
  assert.equal(g.player().alive, false);
  assert.ok(g.snapshot().spike.drop);
  assert.equal(g.snapshot().spike.carrier, null);
});
check('Rotas entre bases e pontos são navegáveis', () => {
  for (const start of [
    { x: 0, z: 24 },
    { x: 0, z: -27 },
  ])
    for (const end of [
      { x: -19, z: -10 },
      { x: 19, z: -10 },
    ])
      assert.ok(g.world.path(start, end).length > 0);
});
check('Colisão impede atravessar fachadas', () => assert.equal(g.world.blocked(-22, 1), true));
check('Interiores dos mercados e arquivo são atravessáveis', () => {
  for (const p of [
    { x: -16, z: 7 },
    { x: 16, z: 7 },
    { x: 2, z: -13 },
  ])
    assert.equal(g.world.blocked(p.x, p.z), false);
});
check('Passagens internas ligam portas opostas', () => {
  for (const x of [-16, 16]) {
    const route = g.world.path({ x, z: 15 }, { x, z: -2 });
    assert.ok(route.length > 0);
    assert.ok(route.some((p) => Math.abs(p.x - x) < 3 && p.z > 2 && p.z < 12));
  }
});
check('Jardim e oficinas possuem rotas até os dois pontos', () => {
  for (const x of [-28, 28])
    for (const end of [
      { x: -19, z: -10 },
      { x: 19, z: -10 },
    ])
      assert.ok(g.world.path({ x, z: 24 }, end).length > 0);
});
check('Cenário estático usa lotes para reduzir chamadas de desenho', () => {
  assert.ok(g.world.props.children.length < 250);
  assert.ok(g.world.scene.environment);
});
const data = (await load(path.join(root, 'data.js'))).namespace;
check('Loja oferece 17 armas de fogo e uma faca', () =>
  assert.equal(Object.keys(data.WEAPONS).length, 18),
);
g.startMatch();
g.openShop();
for (const [id, w] of Object.entries(data.WEAPONS)) {
  if (id === 'knife') continue;
  g.setCredits(9000);
  g.buyWeapon(id);
  check('Compra e carregador válidos: ' + w.name, () => {
    const instance = w.slot === 2 ? g.snapshot().pistol : g.snapshot().primary;
    assert.equal(instance.id, id);
    assert.equal(instance.ammo, w.mag);
    assert.equal(instance.reserve, w.reserve);
    assert.equal(g.snapshot().slot, w.slot);
  });
}
g.buyWeapon('whisper');
g.newRound();
check('Pistola comprada é preservada ao sobreviver', () =>
  assert.equal(g.snapshot().pistol.id, 'whisper'),
);
g.player().alive = false;
g.newRound();
check('Morte devolve a pistola inicial e remove a primária', () => {
  assert.equal(g.snapshot().pistol.id, 'pulse');
  assert.equal(g.snapshot().primary, null);
});
g.startMatch();
g.beginRound();
for (let frame = 0; frame < 6000 && g.snapshot().state !== 'match'; frame++) g.tick(0.2);
check('Partida completa chega ao resultado final com 4 vitórias', () => {
  assert.equal(g.snapshot().state, 'match');
  assert.ok(g.snapshot().score.some((s) => s === 4));
  assert.ok(g.snapshot().round <= 6);
});
const rules = (await load(path.join(root, 'rules.js'))).namespace;
check('Oito agentes possuem quatro habilidades e identidade própria', () => {
  assert.equal(data.AGENTS.length, 8);
  assert.equal(new Set(data.AGENTS.map((a) => a.id)).size, 8);
  for (const agent of data.AGENTS) assert.equal(agent.skills.length, 4);
});
for (let i = 0; i < 8; i++) {
  g.setChosen(i);
  g.startMatch();
  const before = [...g.snapshot().skills];
  g.skill(0);
  check('Compra bloqueia habilidades: ' + data.AGENTS[i].name, () =>
    assert.equal(g.snapshot().skills.join(), before.join()),
  );
  g.beginRound();
  g.skill(0);
  check('Habilidade executada: ' + data.AGENTS[i].name, () =>
    assert.equal(g.snapshot().skills[0], before[0] - 1),
  );
}
g.setMode('competitive');
g.setChosen(0);
g.startMatch();
check('Competitivo inicia com dez jogadores, cinco por equipe', () => {
  assert.equal(g.actors().length, 10);
  for (const team of [0, 1]) {
    const own = g.actors().filter((a) => a.team === team);
    assert.equal(own.length, 5);
    assert.equal(new Set(own.map((a) => a.agent.id)).size, 5);
  }
  assert.equal(g.snapshot().ult, 0);
});
check('Compra cria duas barreiras físicas', () =>
  assert.equal(
    cache.get(path.join(root, 'world.js')).namespace.BLOCKS.filter((b) => b.buy).length,
    2,
  ),
);
check('Barreira bloqueia linha de tiro entre a base e o meio', () =>
  assert.equal(g.world.clearLine({ x: 0, y: 1.5, z: 26 }, { x: 0, y: 1.5, z: 16 }), false),
);
g.keys.add('KeyW');
g.updatePlayer(5);
g.keys.clear();
g.updatePlayer(0.01);
check('Jogador não atravessa a barreira durante a compra', () =>
  assert.ok(g.player().pos.z > 18.4),
);
const ammoBeforeBuy = g.snapshot().pistol.ammo;
g.shoot();
check('Disparos não consomem munição durante a compra', () =>
  assert.equal(g.snapshot().pistol.ammo, ammoBeforeBuy),
);
g.beginRound();
check('Início do round remove as barreiras', () =>
  assert.equal(
    cache.get(path.join(root, 'world.js')).namespace.BLOCKS.filter((b) => b.buy).length,
    0,
  ),
);
g.keys.add('KeyW');
g.updatePlayer(1);
g.keys.clear();
g.updatePlayer(0.01);
check('Rotas ficam livres quando o round começa', () => assert.ok(g.player().pos.z < 18));
check('Competitivo usa 4s para plantar, 45s para detonar e 7s para desarmar', () => {
  const m = g.snapshot().mode;
  assert.equal(m.plant, 4);
  assert.equal(m.spike, 45);
  assert.equal(m.defuse, 7);
});
check('Vitória competitiva exige dois rounds de vantagem', () => {
  assert.equal(rules.matchWinner([13, 12], rules.MODES.competitive), null);
  assert.equal(rules.matchWinner([14, 12], rules.MODES.competitive), 0);
  assert.equal(rules.matchWinner([12, 14], rules.MODES.competitive), 1);
});
check('Troca de lados no intervalo e a cada round da prorrogação', () => {
  assert.equal(rules.attackSide(11, rules.MODES.competitive), 0);
  assert.equal(rules.attackSide(12, rules.MODES.competitive), 1);
  assert.equal(rules.attackSide(24, rules.MODES.competitive), 0);
  assert.equal(rules.attackSide(25, rules.MODES.competitive), 1);
});
g.newRound();
const teammate = g.actors()[1];
g.setPlayer({ ...teammate.pos });
g.dropSpike();
g.updateObjective(0.1);
check('Spike pode ser entregue a um aliado ainda na compra', () =>
  assert.equal(g.snapshot().spike.carrier, teammate),
);
g.newRound();
g.beginRound();
g.dropSpike();
g.updateObjective(0.1);
check('Soltar a spike aplica um intervalo antes de recolher de novo', () =>
  assert.equal(g.snapshot().spike.carrier, null),
);
g.updateObjective(1.6);
check('Portador pode recuperar a spike do chão', () =>
  assert.equal(g.snapshot().spike.carrier, g.player()),
);
g.setPlayer({ x: 0, z: 20 });
g.plant(g.player());
check('Spike não pode ser plantada fora dos pontos', () =>
  assert.equal(g.snapshot().spike.planted, false),
);
g.setPlayer({ x: -19, z: -10 });
g.plant(g.player());
check('Plantio ativa o dispositivo e o contador de 45 segundos', () => {
  assert.equal(g.snapshot().spike.planted, true);
  assert.equal(g.snapshot().spike.time, 45);
});
for (const a of g.actors().filter((a) => a.team === 0)) g.damage(a, 1000, g.actors()[5]);
check('Ataque eliminado após plantar ainda pode vencer pela spike', () =>
  assert.equal(g.snapshot().state, 'live'),
);
g.updateObjective(46);
check('Detonação vence mesmo sem atacantes vivos', () => {
  assert.equal(g.snapshot().state, 'end');
  assert.equal(g.snapshot().score[0], 1);
});
g.startMatch();
g.setRound(12);
g.setCredits(8000);
g.newRound();
check('Intervalo reinicia economia e equipamentos', () => {
  assert.equal(g.snapshot().credits, 800);
  assert.equal(g.snapshot().primary, null);
  assert.equal(g.snapshot().attackTeam, 1);
});
g.beginRound();
const enemyCarrier = g.snapshot().spike.carrier;
enemyCarrier.pos = { x: 19, z: -10 };
g.plant(enemyCarrier);
g.setPlayer({ ...enemyCarrier.pos });
g.keys.add('KeyF');
g.updateObjective(3.6);
g.keys.clear();
g.updateObjective(0.1);
check('Metade do desarme é preservada ao soltar F', () =>
  assert.equal(g.snapshot().spike.defuseFloor, 3.5),
);
g.damage(g.player(), 10, enemyCarrier);
g.keys.add('KeyF');
g.updateObjective(3.6);
g.keys.clear();
check('Desarme continua da metade e encerra o round para a defesa', () => {
  assert.equal(g.snapshot().state, 'end');
  assert.equal(g.snapshot().score[0], 1);
});
g.setRound(24);
g.newRound();
check('Prorrogação concede 5000 créditos ao jogador e equipa os bots', () => {
  assert.equal(g.snapshot().credits, 5000);
  assert.ok(
    g
      .actors()
      .filter((a) => !a.isPlayer)
      .every((a) => a.weaponId !== 'pulse'),
  );
});
g.startMatch();
g.beginRound();
g.cyclePlan();
check('Plano Z altera o objetivo tático dos aliados', () => {
  assert.equal(g.snapshot().attackPlan, 'B');
  assert.ok(g.chooseGoal(g.actors()[1]).x > 0);
});
check('Cada bomb possui quatro planos de entrada navegáveis', () => {
  for (const key of ['A', 'B']) {
    assert.equal(rules.ROUTES[key].length, 4);
    for (const route of rules.ROUTES[key]) {
      let previous = { x: 0, z: 26 };
      for (const point of route.points) {
        assert.ok(g.world.path(previous, point).length > 0, route.name);
        previous = point;
      }
    }
  }
});
g.setChosen(3);
g.startMatch();
g.beginRound();
g.player().armor = 0;
g.skill(0);
check('Aegis restaura o escudo', () => assert.equal(g.player().armor, 50));
g.setUltimate(6);
g.skill(3);
check('Fortaleza ativa resistência temporária', () => assert.equal(g.player().resist, 8));
g.setChosen(5);
g.startMatch();
g.beginRound();
const empTarget = g.actors()[5];
empTarget.pos = { x: 3, z: 26 };
empTarget.armor = 50;
g.setUltimate(6);
g.skill(3);
check('Kite remove escudos e bloqueia disparos com EMP', () => {
  assert.equal(empTarget.armor, 0);
  assert.equal(empTarget.disarmed, 4);
});
g.setChosen(6);
g.startMatch();
g.beginRound();
const fallen = g.actors()[1];
g.damage(fallen, 1000, g.actors()[5]);
g.setUltimate(6);
g.skill(3);
check('Meda revive um aliado próximo com vida completa', () => {
  assert.equal(fallen.alive, true);
  assert.equal(fallen.hp, 100);
});
g.setChosen(0);
g.startMatch();
g.beginRound();
const hitTarget = g.actors()[5];
hitTarget.pos = { x: 0, z: 20 };
hitTarget.armor = 0;
for (const a of g.actors()) a.blind = 100;
g.tick(0.01);
g.shoot();
check('Novos personagens recebem tiros nos proxies de colisão', () =>
  assert.ok(hitTarget.hp < 100),
);
g.setMode('competitive');
g.startMatch();
g.beginRound();
for (let frame = 0; frame < 30000 && g.snapshot().state !== 'match'; frame++) g.tick(0.2);
check('Partida competitiva completa termina com 13+ vitórias e dois de vantagem', () => {
  assert.equal(g.snapshot().state, 'match');
  assert.ok(Math.max(...g.snapshot().score) >= 13);
  assert.ok(Math.abs(g.snapshot().score[0] - g.snapshot().score[1]) >= 2);
});
g.setChosen(7);
g.startMatch();
g.beginRound();
g.setPlayer({ x: -3, z: 21 });
g.skill(1);
for (let i = 0; i < 30; i++) g.updatePlayer(0.05);
check('Salto tático aterrissa sobre a cobertura e permite pular novamente', () => {
  assert.ok(Math.abs(g.snapshot().feet - 2) < 0.02);
  g.keys.add('Space');
  g.updatePlayer(0.05);
  g.keys.clear();
  assert.ok(g.snapshot().feet > 2);
});
g.newRound();
g.beginRound();
g.setPlayer({ x: -26, z: 7 });
g.skill(1);
let maximumFeet = 0;
for (let i = 0; i < 25; i++) {
  g.updatePlayer(0.05);
  maximumFeet = Math.max(maximumFeet, g.snapshot().feet);
}
check('Teto do túnel impede saltos de atravessar a cobertura', () =>
  assert.ok(maximumFeet <= 1.75),
);
console.log(`${count} verificações concluídas.`);
