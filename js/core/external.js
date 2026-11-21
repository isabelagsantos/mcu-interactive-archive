/**
 * Dados externos opcionais (pôster e avaliações) via OMDb API.
 *
 * - Só funciona se o próprio usuário informar uma chave gratuita (omdbapi.com).
 *   A chave fica apenas no navegador dele, nunca no repositório.
 * - Resultados ficam em cache por 30 dias. O cache não é dado pessoal e é
 *   compartilhado entre os perfis do navegador.
 * - Se a API falhar, o app segue funcionando e mostra "indisponível".
 */
import { JsonStore } from './storage.js';

const CACHE_KEY = 'cache:omdb';
const SETTINGS_KEY = 'settings';
const TTL = 30 * 24 * 3600 * 1000;

export class ExternalData {
  constructor(adapter) {
    this.json = new JsonStore(adapter);
    this.cache = this.json.read(CACHE_KEY, {});
    this.inflight = new Map();
  }
  get apiKey() { return this.json.read(SETTINGS_KEY, {}).omdbKey || ''; }
  setApiKey(key) {
    const s = this.json.read(SETTINGS_KEY, {});
    s.omdbKey = String(key || '').trim().replace(/[^\w-]/g, '').slice(0, 40);
    this.json.write(SETTINGS_KEY, s);
  }
  clearCache() { this.cache = {}; this.json.remove(CACHE_KEY); }
  cached(work) {
    const c = this.cache[work.id];
    return c && Date.now() - c.at < TTL ? c : null;
  }
  saveCache() { try { this.json.write(CACHE_KEY, this.cache); } catch { /* cache é opcional */ } }

  /** @returns {Promise<{status:'ok'|'nokey'|'notfound'|'error', poster?, ratings?}>} */
  async get(work) {
    const hit = this.cached(work);
    if (hit) return hit;
    if (!this.apiKey) return { status: 'nokey' };
    if (!work.omdb) return { status: 'notfound' };
    if (this.inflight.has(work.id)) return this.inflight.get(work.id);
    const p = this.fetchWork(work).finally(() => this.inflight.delete(work.id));
    this.inflight.set(work.id, p);
    return p;
  }

  async fetchWork(work) {
    const q = new URLSearchParams({ apikey: this.apiKey, t: work.omdb.t });
    if (work.omdb.y) q.set('y', work.omdb.y);
    if (work.omdb.type) q.set('type', work.omdb.type);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`https://www.omdbapi.com/?${q}`, { signal: ctrl.signal });
      if (!res.ok) return { status: 'error' };
      const d = await res.json();
      if (d.Response === 'False') {
        if (/api key/i.test(d.Error || '')) return { status: 'error', message: 'Chave OMDb inválida.' };
        const out = { status: 'notfound', at: Date.now() };
        this.cache[work.id] = out; this.saveCache();
        return out;
      }
      const ratings = [];
      if (d.imdbRating && d.imdbRating !== 'N/A') ratings.push({ kind: 'publico', source: 'IMDb (via OMDb)', value: `${d.imdbRating}/10`, votes: d.imdbVotes !== 'N/A' ? d.imdbVotes : null });
      for (const r of d.Ratings || []) {
        if (r.Source === 'Rotten Tomatoes') ratings.push({ kind: 'critica', source: 'Rotten Tomatoes (via OMDb)', value: r.Value });
        if (r.Source === 'Metacritic') ratings.push({ kind: 'critica', source: 'Metacritic (via OMDb)', value: r.Value });
      }
      const out = { status: 'ok', at: Date.now(), poster: d.Poster && d.Poster !== 'N/A' ? d.Poster : null, ratings, seriesLevel: work.omdb.type === 'series' };
      this.cache[work.id] = out; this.saveCache();
      return out;
    } catch {
      return { status: 'error' };
    } finally { clearTimeout(timer); }
  }
}
