/** Cálculos derivados (estatísticas, jornada, próxima obra). Sem acesso ao DOM. */
import { WORKS, CHRONO_ORDER, RELEASE_ORDER, BY_ID } from '../catalog/catalog.js';

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const isReleased = (w) => w.releaseKey <= todayISO() && String(w.date).length > 4;
export const isUpcoming = (w) => !isReleased(w);

export function orderedWorks(order) { return order === 'release' ? RELEASE_ORDER : CHRONO_ORDER; }

/** Obras da jornada ativa, já na ordem preferida. */
export function journeyWorks(store) {
  const { journey, order, doomsdayTiers } = store.prefs;
  const list = orderedWorks(order);
  if (journey === 'doomsday') return list.filter((w) => w.target || (w.tier && doomsdayTiers.includes(w.tier)));
  return list.filter((w) => store.item(w.id).selected);
}

export function lastWatched(store) {
  let best = null;
  for (const [id, it] of Object.entries(store.data.items)) {
    for (const h of it.history) {
      if (h.kind === 'before' || !BY_ID[id]) continue;
      if (!best || (h.date || '') >= (best.h.date || '')) best = { work: BY_ID[id], h };
    }
  }
  return best;
}

export function computeStats(store) {
  const list = journeyWorks(store);
  const s = { total: list.length, watched: 0, progress: 0, unwatched: 0, before: 0, rewatches: 0, ratings: [], minutesLeft: 0 };
  for (const w of list) {
    const it = store.item(w.id);
    if (it.status === 'watched') s.watched++;
    else if (it.status === 'progress') s.progress++;
    else s.unwatched++;
    if (it.watchedBefore) s.before++;
    if (it.status !== 'watched' && isReleased(w)) s.minutesLeft += w.min || (w.eps ? w.eps * 45 : 0);
  }
  for (const it of Object.values(store.data.items)) {
    s.rewatches += it.history.filter((h) => h.kind === 'rewatch').length;
    if (it.rating != null) s.ratings.push(it.rating);
  }
  s.avg = s.ratings.length ? s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length : null;
  s.pct = s.total ? Math.round((s.watched / s.total) * 100) : 0;
  s.next = list.find((w) => store.item(w.id).status === 'progress') || list.find((w) => store.item(w.id).status !== 'watched' && isReleased(w)) || null;
  s.last = lastWatched(store);
  return s;
}

export function groupProgress(store, key) {
  const list = journeyWorks(store);
  const groups = new Map();
  for (const w of list) {
    const g = w[key];
    if (!groups.has(g)) groups.set(g, { key: g, total: 0, watched: 0 });
    const e = groups.get(g); e.total++;
    if (store.item(w.id).status === 'watched') e.watched++;
  }
  return [...groups.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

/** Pontos (data, total acumulado) das visualizações concluídas. */
export function watchTimeline(store) {
  const dates = [];
  for (const [id, it] of Object.entries(store.data.items)) {
    if (!BY_ID[id]) continue;
    for (const h of it.history) if (h.kind !== 'before' && h.date) dates.push({ date: h.date, id, kind: h.kind, rating: h.rating });
  }
  return dates.sort((a, b) => a.date.localeCompare(b.date));
}

export function allWorks() { return WORKS; }
