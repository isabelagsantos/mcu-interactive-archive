import { WORKS, TYPES, SAGAS, PRESETS } from '../../catalog/catalog.js';
import { orderedWorks, isUpcoming } from '../../core/selectors.js';
import { esc, $, cover, statusBadge, duration, emptyState, sagaLabel, typeLabel } from '../dom.js';

export const defaultFilters = () => ({ q: '', phase: '', saga: '', year: '', type: '', status: '', sel: '', order: 'release', group: 'phase' });

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filterWorks(ctx, f) {
  const q = norm(f.q.trim());
  return orderedWorks(f.order).filter((w) => {
    const it = ctx.store.item(w.id);
    if (f.phase && String(w.phase) !== f.phase) return false;
    if (f.saga && w.saga !== f.saga) return false;
    if (f.year && String(w.year) !== f.year) return false;
    if (f.type && w.type !== f.type) return false;
    if (f.status === 'upcoming' ? !isUpcoming(w) : f.status && it.status !== f.status) return false;
    if (f.sel === 'yes' && !it.selected) return false;
    if (f.sel === 'no' && it.selected) return false;
    if (f.sel === 'fav' && !it.favorite) return false;
    if (q && !norm(`${w.t} ${w.o} ${w.chars.join(' ')}`).includes(q)) return false;
    return true;
  });
}

const opt = (v, l, cur) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;

export function card(ctx, w) {
  const it = ctx.store.item(w.id);
  return `<article class="card ${it.selected ? 'is-selected' : ''} st-${it.status}">
    <button class="card-open" data-action="open" data-id="${w.id}" aria-label="Abrir detalhes de ${esc(w.t)}">${cover(w, ctx.external.cached(w)?.poster)}</button>
    <div class="card-body"><h3>${esc(w.t)}</h3>
      <p class="muted tiny">${w.year} · ${esc(typeLabel(w))} · ${esc(duration(w))}</p>
      <div class="row wrap gap-s">${statusBadge(it, w)}${it.rating != null ? `<span class="badge">${it.rating}/10</span>` : ''}${it.favorite ? '<span class="badge badge-fav">★</span>' : ''}</div></div>
    <div class="card-actions">
      <button class="icon-btn ${it.selected ? 'on' : ''}" data-action="select" data-id="${w.id}" aria-pressed="${it.selected}" aria-label="${it.selected ? 'Remover da' : 'Adicionar à'} minha lista: ${esc(w.t)}" title="${it.selected ? 'Na minha lista' : 'Adicionar à lista'}">${it.selected ? '✓' : '+'}</button>
      <button class="icon-btn" data-action="status" data-id="${w.id}" data-value="${it.status === 'watched' ? 'unwatched' : 'watched'}" ${isUpcoming(w) ? 'disabled' : ''} aria-label="${it.status === 'watched' ? 'Desmarcar' : 'Marcar como assistida'}: ${esc(w.t)}" title="${it.status === 'watched' ? 'Desmarcar assistida' : 'Marcar como assistida'}">${it.status === 'watched' ? '◉' : '◯'}</button>
    </div></article>`;
}

export function results(ctx) {
  const f = ctx.ui.filters;
  const list = filterWorks(ctx, f);
  if (!list.length) return emptyState('Nenhum arquivo encontrado', 'Ajuste os filtros ou a busca.', '<button class="btn ghost" data-action="clear-filters">Limpar filtros</button>');
  const keyOf = { phase: (w) => `Fase ${w.phase} · ${sagaLabel(w.saga)}`, saga: (w) => sagaLabel(w.saga), year: (w) => String(w.year), none: () => '' }[f.group] || (() => '');
  const groups = new Map();
  for (const w of list) { const k = keyOf(w); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(w); }
  return `<p class="muted tiny" aria-live="polite">${list.length} obra(s)</p>` + [...groups].map(([k, ws]) => `${k ? `<h2 class="group-title">${esc(k)} <small>${ws.length}</small></h2>` : ''}<div class="cards">${ws.map((w) => card(ctx, w)).join('')}</div>`).join('');
}

export function render(ctx) {
  const f = ctx.ui.filters;
  const years = [...new Set(WORKS.map((w) => w.year))].sort();
  return `<section class="view"><header class="view-head"><p class="eyebrow">BANCO DE DADOS · ${WORKS.length} ARQUIVOS</p><h1>Catálogo</h1></header>
    <form class="filters panel" data-form="filters" role="search" onsubmit="return false">
      <label class="field grow"><span>Buscar título ou personagem</span><input type="search" name="q" value="${esc(f.q)}" placeholder="Ex.: Loki, Yelena, Wakanda" autocomplete="off"></label>
      <label class="field"><span>Fase</span><select name="phase">${opt('', 'Todas', f.phase)}${[1, 2, 3, 4, 5, 6].map((p) => opt(p, `Fase ${p}`, f.phase)).join('')}</select></label>
      <label class="field"><span>Saga</span><select name="saga">${opt('', 'Todas', f.saga)}${Object.values(SAGAS).map((s) => opt(s.id, s.label, f.saga)).join('')}</select></label>
      <label class="field"><span>Ano</span><select name="year">${opt('', 'Todos', f.year)}${years.map((y) => opt(y, y, f.year)).join('')}</select></label>
      <label class="field"><span>Tipo</span><select name="type">${opt('', 'Todos', f.type)}${Object.entries(TYPES).map(([k, l]) => opt(k, l, f.type)).join('')}</select></label>
      <label class="field"><span>Status</span><select name="status">${opt('', 'Todos', f.status)}${opt('unwatched', 'Não assistida', f.status)}${opt('progress', 'Em andamento', f.status)}${opt('watched', 'Assistida', f.status)}${opt('upcoming', 'Em breve', f.status)}</select></label>
      <label class="field"><span>Seleção</span><select name="sel">${opt('', 'Todas', f.sel)}${opt('yes', 'Na minha lista', f.sel)}${opt('no', 'Fora da lista', f.sel)}${opt('fav', 'Favoritas', f.sel)}</select></label>
      <label class="field"><span>Ordem</span><select name="order">${opt('release', 'Lançamento', f.order)}${opt('chrono', 'Cronológica', f.order)}</select></label>
      <label class="field"><span>Agrupar</span><select name="group">${opt('phase', 'Fase', f.group)}${opt('saga', 'Saga', f.group)}${opt('year', 'Ano', f.group)}${opt('none', 'Sem grupos', f.group)}</select></label>
    </form>
    <div class="row wrap gap-s bulk"><span class="muted tiny">Seleção rápida:</span>
      ${Object.entries(PRESETS).map(([k, p]) => `<button class="btn ghost small" data-action="preset" data-value="${k}" title="${esc(p.desc)}">${esc(p.label)}</button>`).join('')}
      <button class="btn ghost small" data-action="select-visible">+ Selecionar resultados</button>
      <button class="btn ghost small danger-text" data-action="preset" data-value="clear">Limpar seleção</button>
      ${ctx.external.apiKey ? '<button class="btn ghost small" data-action="load-posters">Carregar pôsteres</button>' : ''}</div>
    <div id="catalog-results">${results(ctx)}</div></section>`;
}

export function onFilter(ctx, form) {
  const fd = new FormData(form);
  for (const k of Object.keys(ctx.ui.filters)) if (fd.has(k)) ctx.ui.filters[k] = String(fd.get(k));
  const box = $('#catalog-results');
  if (box) box.innerHTML = results(ctx);
}
