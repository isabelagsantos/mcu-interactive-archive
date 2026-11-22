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
const TTL_MISS = 2 * 24 * 3600 * 1000; // "não encontrado" expira rápido, para o catálogo poder ser corrigido
const CACHE_VERSION = 3; // aumente para descartar o cache de todos os usuários

export class ExternalData {
  constructor(adapter) {
    this.json = new JsonStore(adapter);
    this.cache = this.json.read(CACHE_KEY, {});
    if (this.cache.__v !== CACHE_VERSION) this.cache = { __v: CACHE_VERSION };
    this.inflight = new Map();
    this.paused = false; // true quando a chave é inválida ou o limite diário acabou
    this.pausedMsg = '';
  }
  get apiKey() { return this.json.read(SETTINGS_KEY, {}).omdbKey || ''; }
  setApiKey(key) {
    const s = this.json.read(SETTINGS_KEY, {});
    s.omdbKey = String(key || '').trim().replace(/[^\w-]/g, '').slice(0, 40);
    this.json.write(SETTINGS_KEY, s);
    this.paused = false;
  }
  clearCache() { this.cache = { __v: CACHE_VERSION }; this.json.remove(CACHE_KEY); }
  cached(work) {
    const c = this.cache[work.id];
    return c && Date.now() - c.at < (c.status === 'ok' ? TTL : TTL_MISS) ? c : null;
  }
  saveCache() { try { this.json.write(CACHE_KEY, this.cache); } catch { /* cache é opcional */ } }

  /** @returns {Promise<{status:'ok'|'nokey'|'notfound'|'error', poster?, ratings?}>} */
  async get(work) {
    const hit = this.cached(work);
    if (hit) return hit;
    if (!this.apiKey) return { status: 'nokey' };
    if (this.paused) return { status: 'error', message: this.pausedMsg };
    if (!work.omdb) return { status: 'notfound' };
    if (this.inflight.has(work.id)) return this.inflight.get(work.id);
    const p = this.fetchWork(work).finally(() => this.inflight.delete(work.id));
    this.inflight.set(work.id, p);
    return p;
  }

  pause(message) { this.paused = true; this.pausedMsg = message; return { status: 'error', message }; }

  /** Uma chamada à OMDb. Devolve { d } com os dados, { miss: true } se não achou, ou um resultado de erro. */
  async call(params) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`https://www.omdbapi.com/?${new URLSearchParams({ apikey: this.apiKey, ...params })}`, { signal: ctrl.signal });
      if (!res.ok) return { error: { status: 'error' } };
      const d = await res.json();
      if (d.Response !== 'False') return { d };
      const err = d.Error || '';
      if (/api key/i.test(err)) return { error: this.pause('Chave OMDb inválida.') };
      if (/limit/i.test(err)) return { error: this.pause('Limite diário da OMDb atingido. Os pôsteres voltam a carregar amanhã.') };
      if (!/not found/i.test(err)) return { error: { status: 'error' } }; // erro desconhecido: não grava no cache
      return { miss: true };
    } catch { return { error: { status: 'error' } }; } finally { clearTimeout(timer); }
  }

  /** Busca por título exato; se falhar, procura por palavras-chave e abre o melhor resultado pelo código IMDb. */
  async find(work) {
    const { t, y, type, i } = work.omdb;
    if (i) { const r0 = await this.call({ i }); if (!r0.miss) return r0; } // código IMDb fixo, quando o catálogo informa
    const base = {};
    if (type) base.type = type;
    let r = await this.call({ ...base, t, ...(y ? { y } : {}) });
    if (!r.miss) return r;
    const clean = t.replace(/[^\p{L}\p{N}\s:'.-]/gu, '').trim(); // ex.: "Thunderbolts*" → "Thunderbolts"
    for (const withYear of y ? [true, false] : [false]) {
      const s = await this.call({ ...base, s: clean, ...(withYear ? { y } : {}) });
      if (s.error) return s;
      if (s.miss || !s.d.Search?.length) continue;
      const norm = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      const hit = s.d.Search.find((x) => norm(x.Title) === norm(clean)) || (withYear ? s.d.Search[0] : null);
      if (!hit) continue;
      r = await this.call({ i: hit.imdbID });
      if (!r.miss) return r;
    }
    return { miss: true };
  }

  async fetchWork(work) {
    const r = await this.find(work);
    if (r.error) return r.error;
    if (r.miss) {
      const out = { status: 'notfound', at: Date.now() };
      this.cache[work.id] = out; this.saveCache();
      return out;
    }
    const d = r.d;
    const ratings = [];
    if (d.imdbRating && d.imdbRating !== 'N/A') ratings.push({ kind: 'publico', source: 'IMDb (via OMDb)', value: `${d.imdbRating}/10`, votes: d.imdbVotes !== 'N/A' ? d.imdbVotes : null });
    for (const x of d.Ratings || []) {
      if (x.Source === 'Rotten Tomatoes') ratings.push({ kind: 'critica', source: 'Rotten Tomatoes (via OMDb)', value: x.Value });
      if (x.Source === 'Metacritic') ratings.push({ kind: 'critica', source: 'Metacritic (via OMDb)', value: x.Value });
    }
    const out = { status: 'ok', at: Date.now(), poster: d.Poster && d.Poster !== 'N/A' ? d.Poster : null, ratings, seriesLevel: work.omdb.type === 'series' };
    this.cache[work.id] = out; this.saveCache();
    return out;
  }
}
