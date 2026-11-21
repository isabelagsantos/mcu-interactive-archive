/**
 * Perfis locais. Cada navegador já é isolado, e os perfis permitem que mais de
 * uma pessoa use o mesmo navegador sem misturar os dados.
 * Chaves: "profiles" (índice) e "profile:<id>:data" (dados de cada perfil).
 */
import { JsonStore } from './storage.js';

const INDEX_KEY = 'profiles';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

export class ProfileManager {
  constructor(adapter) {
    this.json = new JsonStore(adapter);
    this.index = this.json.read(INDEX_KEY, null);
    if (!this.index || !Array.isArray(this.index.list) || !this.index.list.length) {
      const id = uid();
      this.index = { active: id, list: [{ id, name: 'Agente', createdAt: new Date().toISOString() }] };
      this.save();
    }
    if (!this.index.list.some((p) => p.id === this.index.active)) this.index.active = this.index.list[0].id;
  }
  save() { this.json.write(INDEX_KEY, this.index); }
  static dataKey(id) { return `profile:${id}:data`; }
  get activeId() { return this.index.active; }
  get active() { return this.index.list.find((p) => p.id === this.index.active); }
  get list() { return this.index.list; }
  create(name) {
    const p = { id: uid(), name: (name || 'Novo agente').slice(0, 40), createdAt: new Date().toISOString() };
    this.index.list.push(p); this.index.active = p.id; this.save();
    return p;
  }
  switchTo(id) { if (this.index.list.some((p) => p.id === id)) { this.index.active = id; this.save(); } }
  rename(id, name) { const p = this.index.list.find((x) => x.id === id); if (p && name) { p.name = name.slice(0, 40); this.save(); } }
  remove(id) {
    if (this.index.list.length <= 1) return false;
    this.index.list = this.index.list.filter((p) => p.id !== id);
    this.json.remove(ProfileManager.dataKey(id));
    if (this.index.active === id) this.index.active = this.index.list[0].id;
    this.save();
    return true;
  }
}
