/**
 * Registros pessoais de um perfil: seleção, status, histórico, notas,
 * favoritos e preferências. Ficam separados do catálogo e ligados por id;
 * registros de obras que saírem do catálogo são preservados, nunca apagados.
 */
import { JsonStore } from './storage.js';
import { ProfileManager } from './profiles.js';

export const SCHEMA_VERSION = 1;
export const APP_ID = 'mcu-interactive-archive';

export const STATUS = { unwatched: 'Não assistida', progress: 'Em andamento', watched: 'Assistida' };
export const VIEW_KIND = { first: 'Primeira visualização', before: 'Assistida anteriormente', rewatch: 'Reassistida' };

const today = () => new Date().toISOString().slice(0, 10);
const rid = () => Math.random().toString(36).slice(2, 10);

export const defaultPrefs = () => ({ theme: 'classic', journey: 'full', order: 'chrono', doomsdayTiers: ['e', 'r'] });
const emptyData = () => ({ schema: SCHEMA_VERSION, prefs: defaultPrefs(), items: {}, updatedAt: null });
export const emptyItem = () => ({ selected: false, status: 'unwatched', mode: 'first', watchedBefore: false, favorite: false, rating: null, review: '', notes: '', history: [] });

function clampRating(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(0, Math.round(n * 2) / 2));
}

/** Normaliza e valida dados vindos do storage ou de um backup importado. */
export function normalizeData(raw) {
  const data = emptyData();
  if (!raw || typeof raw !== 'object') return data;
  data.prefs = { ...defaultPrefs(), ...(raw.prefs && typeof raw.prefs === 'object' ? raw.prefs : {}) };
  if (!['classic', 'doomsday'].includes(data.prefs.theme)) data.prefs.theme = 'classic';
  if (!['full', 'doomsday'].includes(data.prefs.journey)) data.prefs.journey = 'full';
  if (!['chrono', 'release'].includes(data.prefs.order)) data.prefs.order = 'chrono';
  if (!Array.isArray(data.prefs.doomsdayTiers)) data.prefs.doomsdayTiers = ['e', 'r'];
  const items = raw.items && typeof raw.items === 'object' ? raw.items : {};
  for (const [id, it] of Object.entries(items)) {
    if (!it || typeof it !== 'object' || !/^[\w-]{1,60}$/.test(id)) continue;
    const base = emptyItem();
    const item = {
      selected: !!it.selected,
      status: STATUS[it.status] ? it.status : 'unwatched',
      mode: it.mode === 'rewatch' ? 'rewatch' : 'first',
      watchedBefore: !!it.watchedBefore,
      favorite: !!it.favorite,
      rating: clampRating(it.rating),
      review: typeof it.review === 'string' ? it.review.slice(0, 5000) : '',
      notes: typeof it.notes === 'string' ? it.notes.slice(0, 5000) : '',
      history: Array.isArray(it.history) ? it.history.filter((h) => h && typeof h === 'object').map((h) => ({
        id: typeof h.id === 'string' ? h.id : rid(),
        date: /^\d{4}-\d{2}-\d{2}$/.test(h.date) ? h.date : null,
        kind: VIEW_KIND[h.kind] ? h.kind : 'first',
        rating: clampRating(h.rating),
        review: typeof h.review === 'string' ? h.review.slice(0, 5000) : '',
        notes: typeof h.notes === 'string' ? h.notes.slice(0, 5000) : '',
      })) : [],
    };
    data.items[id] = { ...base, ...item };
  }
  data.updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : null;
  return data;
}

/** Valida um backup e devolve os dados. Lança erro com mensagem amigável. */
export function validateBackup(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Arquivo vazio ou inválido.');
  const payload = obj.app === APP_ID ? obj.data : obj.items ? obj : null;
  if (!payload || typeof payload !== 'object') throw new Error('Este arquivo não parece ser um backup do MCU Interactive Archive.');
  if (Number(obj.schema || payload.schema || 1) > SCHEMA_VERSION) throw new Error('O backup foi criado por uma versão mais nova do app.');
  return payload;
}

export class UserStore {
  constructor(adapter) {
    this.json = new JsonStore(adapter);
    this.listeners = new Set();
    this.profileId = null;
    this.data = emptyData();
    this.lastError = null;
  }
  load(profileId) {
    this.profileId = profileId;
    this.data = normalizeData(this.json.read(ProfileManager.dataKey(profileId), null));
    this.emit();
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach((fn) => fn(this.data)); }
  persist() {
    this.data.updatedAt = new Date().toISOString();
    try { this.json.write(ProfileManager.dataKey(this.profileId), this.data); this.lastError = null; }
    catch (e) { this.lastError = e.message; }
    this.emit();
  }

  // ----- leitura -----
  item(id) { return this.data.items[id] || emptyItem(); }
  get prefs() { return this.data.prefs; }
  rewatchCount(id) { return this.item(id).history.filter((h) => h.kind === 'rewatch').length; }

  // ----- escrita -----
  mutate(id, fn) {
    const it = { ...emptyItem(), ...(this.data.items[id] || {}) };
    it.history = [...(it.history || [])];
    fn(it);
    this.data.items[id] = it;
    this.persist();
  }
  setPref(key, value) { this.data.prefs = { ...this.data.prefs, [key]: value }; this.persist(); }
  toggleSelected(id, value) { this.mutate(id, (it) => { it.selected = value ?? !it.selected; }); }
  setSelection(ids, value = true) {
    for (const id of ids) {
      const it = { ...emptyItem(), ...(this.data.items[id] || {}) };
      it.selected = value; this.data.items[id] = it;
    }
    this.persist();
  }
  clearSelection() { for (const it of Object.values(this.data.items)) it.selected = false; this.persist(); }
  toggleFavorite(id) { this.mutate(id, (it) => { it.favorite = !it.favorite; }); }
  toggleWatchedBefore(id) { this.mutate(id, (it) => { it.watchedBefore = !it.watchedBefore; }); }

  /** status: unwatched | progress. "watched" passa por complete(). */
  setStatus(id, status) {
    this.mutate(id, (it) => {
      if (status === 'unwatched') { it.status = 'unwatched'; it.mode = 'first'; }
      if (status === 'progress') {
        it.status = 'progress';
        // Se já viu antes (no app ou fora dele), esta sessão conta como reassistida.
        it.mode = it.history.length || it.watchedBefore ? 'rewatch' : 'first';
        it.selected = true;
      }
    });
  }
  startRewatch(id) { this.mutate(id, (it) => { it.status = 'progress'; it.mode = 'rewatch'; it.selected = true; }); }

  /** Registra uma visualização concluída e atualiza nota, resenha e observações atuais. */
  complete(id, { date, kind, rating, review, notes }) {
    this.mutate(id, (it) => {
      const k = VIEW_KIND[kind] ? kind : 'first';
      const entry = { id: rid(), date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today(), kind: k, rating: clampRating(rating), review: (review || '').slice(0, 5000), notes: (notes || '').slice(0, 5000) };
      it.history.push(entry);
      it.history.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      if (k === 'before') it.watchedBefore = true;
      if (k !== 'before') { it.status = 'watched'; it.mode = 'first'; }
      if (entry.rating != null) it.rating = entry.rating;
      if (entry.review) it.review = entry.review;
      if (entry.notes) it.notes = entry.notes;
    });
  }
  /** Edita a nota e a resenha atuais sem criar uma nova visualização. */
  editReview(id, { rating, review, notes }) {
    this.mutate(id, (it) => { it.rating = clampRating(rating); it.review = (review || '').slice(0, 5000); it.notes = (notes || '').slice(0, 5000); });
  }
  removeHistory(id, entryId) {
    this.mutate(id, (it) => {
      it.history = it.history.filter((h) => h.id !== entryId);
      if (!it.history.some((h) => h.kind !== 'before') && it.status === 'watched') it.status = 'unwatched';
    });
  }

  // ----- backup -----
  exportData(profileName) {
    return { app: APP_ID, schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), profile: { name: profileName }, data: this.data };
  }
  /** Lança erro com mensagem amigável se o arquivo não for um backup válido. */
  importData(obj) {
    this.data = normalizeData(validateBackup(obj));
    this.persist();
    return Object.keys(this.data.items).length;
  }
  reset({ keepPrefs = true } = {}) {
    const prefs = this.data.prefs;
    this.data = emptyData();
    if (keepPrefs) this.data.prefs = prefs;
    this.persist();
  }
}
