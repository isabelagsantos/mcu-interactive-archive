import { BY_ID } from '../../catalog/catalog.js';
import { VIEW_KIND } from '../../core/userStore.js';
import { esc, $, fmtDate, emptyState, typeLabel } from '../dom.js';

export const defaultDiary = () => ({ sort: 'date-desc', kind: '', fav: false, phase: '' });

function entries(ctx) {
  const out = [];
  for (const [id, it] of Object.entries(ctx.store.data.items)) {
    const w = BY_ID[id];
    if (!w) continue;
    for (const h of it.history) out.push({ w, it, h });
    if (!it.history.length && (it.watchedBefore || it.status === 'watched')) out.push({ w, it, h: { id: '', date: null, kind: it.watchedBefore ? 'before' : 'first', rating: it.rating } });
  }
  return out;
}

function list(ctx) {
  const d = ctx.ui.diary;
  let es = entries(ctx).filter((e) => (!d.kind || e.h.kind === d.kind) && (!d.fav || e.it.favorite) && (!d.phase || String(e.w.phase) === d.phase));
  const cmp = {
    'date-desc': (a, b) => (b.h.date || '').localeCompare(a.h.date || ''),
    'date-asc': (a, b) => (a.h.date || '9999').localeCompare(b.h.date || '9999'),
    'rating-desc': (a, b) => (b.h.rating ?? b.it.rating ?? -1) - (a.h.rating ?? a.it.rating ?? -1),
    title: (a, b) => a.w.t.localeCompare(b.w.t, 'pt'),
  }[d.sort];
  es = es.sort(cmp);
  if (!es.length) return emptyState('Diário vazio', 'Ao concluir uma obra, o registro aparece aqui.', '<a class="btn ghost" href="#/catalogo">Ir ao catálogo</a>');
  return `<ol class="diary">${es.map(({ w, it, h }) => `<li><button data-action="open" data-id="${w.id}" class="diary-item">
    <span class="d-date">${esc(h.date ? fmtDate(h.date) : 'sem data')}</span>
    <span class="d-title"><strong>${esc(w.t)}</strong>${it.favorite ? ' <span class="badge badge-fav">★</span>' : ''}<span class="muted tiny"> · ${esc(typeLabel(w))} · Fase ${w.phase}</span></span>
    <span class="h-kind k-${h.kind}">${esc(VIEW_KIND[h.kind])}</span>
    <span class="d-rate">${(h.rating ?? it.rating) != null ? `${h.rating ?? it.rating}/10` : '—'}</span>
    ${(h.review || it.review) ? `<span class="d-review">${esc((h.review || it.review).slice(0, 180))}${(h.review || it.review).length > 180 ? '…' : ''}</span>` : ''}</button></li>`).join('')}</ol>`;
}

function ratingChart(points) {
  if (points.length < 2) return '<p class="muted">Registre ao menos duas notas com data para ver a evolução.</p>';
  const W = 600, H = 150, P = 24;
  const xy = points.map((p, i) => [P + (i / (points.length - 1)) * (W - 2 * P), H - P - (p.r / 10) * (H - 2 * P)]);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução das notas pessoais">
    ${[0, 5, 10].map((v) => `<line x1="${P}" x2="${W - P}" y1="${H - P - (v / 10) * (H - 2 * P)}" y2="${H - P - (v / 10) * (H - 2 * P)}" class="grid-l"/><text x="4" y="${H - P - (v / 10) * (H - 2 * P) + 4}" class="lbl">${v}</text>`).join('')}
    <polyline class="line" points="${xy.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}"/>
    ${xy.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"><title>${esc(points[i].t)}: ${points[i].r}/10</title></circle>`).join('')}</svg>`;
}

function retro(ctx) {
  const items = Object.entries(ctx.store.data.items).filter(([id]) => BY_ID[id]);
  const rated = items.filter(([, it]) => it.rating != null).map(([id, it]) => ({ w: BY_ID[id], r: it.rating })).sort((a, b) => b.r - a.r);
  const byPhase = {};
  for (const { w, r } of rated) (byPhase[w.phase] ||= []).push(r);
  const phases = Object.entries(byPhase).map(([p, rs]) => ({ p, avg: rs.reduce((a, b) => a + b, 0) / rs.length, n: rs.length })).sort((a, b) => b.avg - a.avg);
  const points = entries(ctx).filter((e) => e.h.date && e.h.rating != null).sort((a, b) => a.h.date.localeCompare(b.h.date)).map((e) => ({ t: e.w.t, r: e.h.rating }));
  const favs = items.filter(([, it]) => it.favorite).map(([id]) => BY_ID[id]);
  const rewatched = items.map(([id, it]) => ({ w: BY_ID[id], n: it.history.filter((h) => h.kind === 'rewatch').length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
  return `<div class="grid two">
    <div class="panel"><h3>Mais bem avaliadas</h3>${rated.length ? `<ol class="rank">${rated.slice(0, 5).map(({ w, r }) => `<li><button data-action="open" data-id="${w.id}">${esc(w.t)}</button><span>${r}/10</span></li>`).join('')}</ol>` : '<p class="muted">Sem notas ainda.</p>'}</div>
    <div class="panel"><h3>Fases favoritas</h3>${phases.length ? `<ol class="rank">${phases.map((x) => `<li><span>Fase ${x.p}</span><span>${x.avg.toFixed(1)} · ${x.n} nota(s)</span></li>`).join('')}</ol>` : '<p class="muted">Sem notas ainda.</p>'}</div>
    <div class="panel"><h3>Favoritas</h3>${favs.length ? `<div class="chips">${favs.map((w) => `<button class="chip link" data-action="open" data-id="${w.id}">★ ${esc(w.t)}</button>`).join('')}</div>` : '<p class="muted">Marque favoritas pelo detalhe da obra.</p>'}</div>
    <div class="panel"><h3>Histórico de reassistidas</h3>${rewatched.length ? `<ol class="rank">${rewatched.map((x) => `<li><button data-action="open" data-id="${x.w.id}">${esc(x.w.t)}</button><span>${x.n}×</span></li>`).join('')}</ol>` : '<p class="muted">Nenhuma reassistida registrada.</p>'}</div>
    <div class="panel wide"><h3>Evolução das minhas notas</h3>${ratingChart(points)}</div></div>`;
}

const opt = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${l}</option>`;

export function render(ctx) {
  const d = ctx.ui.diary;
  return `<section class="view"><header class="view-head"><p class="eyebrow">REGISTROS DO AGENTE</p><h1>Diário cinematográfico</h1></header>
    <h2 class="group-title">Retrospectiva</h2>${retro(ctx)}
    <h2 class="group-title">Registros</h2>
    <form class="filters panel" data-form="diary" onsubmit="return false">
      <label class="field"><span>Ordenar</span><select name="sort">${opt('date-desc', 'Mais recentes', d.sort)}${opt('date-asc', 'Mais antigos', d.sort)}${opt('rating-desc', 'Maior nota', d.sort)}${opt('title', 'Título', d.sort)}</select></label>
      <label class="field"><span>Tipo de visualização</span><select name="kind">${opt('', 'Todos', d.kind)}${Object.entries(VIEW_KIND).map(([k, l]) => opt(k, l, d.kind)).join('')}</select></label>
      <label class="field"><span>Fase</span><select name="phase">${opt('', 'Todas', d.phase)}${[1, 2, 3, 4, 5, 6].map((p) => opt(p, `Fase ${p}`, d.phase)).join('')}</select></label>
      <label class="toggle"><input type="checkbox" name="fav" ${d.fav ? 'checked' : ''}> Só favoritas</label></form>
    <div id="diary-results">${list(ctx)}</div></section>`;
}

export function onFilter(ctx, form) {
  const fd = new FormData(form);
  ctx.ui.diary = { sort: fd.get('sort'), kind: fd.get('kind'), phase: fd.get('phase'), fav: fd.has('fav') };
  const box = $('#diary-results');
  if (box) box.innerHTML = list(ctx);
}
