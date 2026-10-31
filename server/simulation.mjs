import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function loadHeadlessGame() {
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
    }
    const m = new vm.SourceTextModule(src, { context: ctx, identifier: file });
    cache.set(file, m);
    await m.link((spec) => load(path.resolve(path.dirname(file), spec)));
    return m;
  }

  const game = await load(path.join(root, 'game.js'));
  await game.evaluate();
  return game.namespace;
}

export async function createSimulation(roster, options) {
  const api = (await loadHeadlessGame()).networkEngine;
  api.start(roster, options);
  return api;
}
