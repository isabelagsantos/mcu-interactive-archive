/**
 * Camada de armazenamento, separada da interface.
 *
 * Toda leitura e escrita passa por um "adapter" com a mesma interface
 * (get/set/remove/keys). Hoje existe o LocalStorageAdapter (com fallback em
 * memória). Para sincronizar com um serviço no futuro, basta criar outro adapter
 * com os mesmos métodos e passá-lo ao criar os repositórios.
 */

export class StorageError extends Error {}

export class MemoryAdapter {
  constructor() { this.map = new Map(); this.persistent = false; }
  get(key) { return this.map.has(key) ? this.map.get(key) : null; }
  set(key, value) { this.map.set(key, String(value)); }
  remove(key) { this.map.delete(key); }
  keys() { return [...this.map.keys()]; }
}

export class LocalStorageAdapter {
  /** @param {string} namespace prefixo que isola as chaves deste app */
  constructor(namespace) { this.ns = namespace; this.persistent = true; }
  static isAvailable() {
    try {
      const k = '__mcu_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch { return false; }
  }
  get(key) {
    try { return window.localStorage.getItem(this.ns + key); } catch { return null; }
  }
  set(key, value) {
    try { window.localStorage.setItem(this.ns + key, String(value)); }
    catch (e) { throw new StorageError(e && e.name === 'QuotaExceededError' ? 'Espaço de armazenamento do navegador esgotado.' : 'Não foi possível salvar no navegador.'); }
  }
  remove(key) { try { window.localStorage.removeItem(this.ns + key); } catch { /* ignora */ } }
  keys() {
    const out = [];
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(this.ns)) out.push(k.slice(this.ns.length));
      }
    } catch { /* ignora */ }
    return out;
  }
}

export function createAdapter(namespace = 'mcuarchive:') {
  return LocalStorageAdapter.isAvailable() ? new LocalStorageAdapter(namespace) : new MemoryAdapter();
}

/** Leitura e escrita de JSON com tolerância a dados corrompidos. */
export class JsonStore {
  constructor(adapter) { this.adapter = adapter; }
  read(key, fallback) {
    const raw = this.adapter.get(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }
  write(key, value) { this.adapter.set(key, JSON.stringify(value)); }
  remove(key) { this.adapter.remove(key); }
}
