import { BY_ID, SAGAS, PRESETS } from '../../catalog/catalog.js';
import { computeStats, groupProgress, watchTimeline } from '../../core/selectors.js';
import { esc, fmtDate, fmtHours, duration, cover, statusBadge, emptyState, sagaLabel } from '../dom.js';

const bar = (label, done, total) => {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="pbar"><div class="pbar-top"><span>${esc(label)}</span><span>${done}/${total} · ${pct}%</span></div>
    <div class="pbar-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(label)}"><i style="width:${pct}%"></i></div></div>`;
};

function evolutionChart(points) {
  if (points.length < 2) return '<p class="muted">O gráfico de evolução aparece depois de registrar duas visualizações com data.</p>';
  const W = 600, H = 160, P = 24;
  const t0 = Date.parse(points[0].date), t1 = Date.parse(points[points.length - 1].date) || t0 + 1;
  const span = Math.max(t1 - t0, 86400000);
  const xy = points.map((p, i) => [P + ((Date.parse(p.date) - t0) / span) * (W - 2 * P), H - P - ((i + 1) / points.length) * (H - 2 * P)]);
  const line = xy.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Total acumulado de visualizações: ${points.length}">
    <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" class="axis"/>
    <polyline points="${P},${H - P} ${line} ${xy[xy.length - 1][0].toFixed(1)},${H - P}" class="area"/>
    <polyline points="${line}" class="line"/>
    ${xy.map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3"><title>${esc(fmtDate(points[i].date))}: ${esc(BY_ID[points[i].id]?.t)}</title></circle>`).join('')}
    <text x="${P}" y="${H - 6}" class="lbl">${esc(fmtDate(points[0].date))}</text>
    <text x="${W - P}" y="${H - 6}" class="lbl" text-anchor="end">${esc(fmtDate(points[points.length - 1].date))}</text>
    <text x="${P}" y="14" class="lbl">${points.length} visualizações</text></svg>`;
}

export function render(ctx) {
  const { store } = ctx;
  const s = computeStats(store);
  const mode = store.prefs.journey;
  const ring = `<svg viewBox="0 0 120 120" class="ring" aria-hidden="true"><circle cx="60" cy="60" r="52" class="ring-bg"/>
    <circle cx="60" cy="60" r="52" class="ring-fg" style="stroke-dasharray:${(s.pct / 100) * 326.7} 326.7"/></svg>`;

  if (!s.total && mode === 'full') {
    return `<section class="view"><header class="view-head"><p class="eyebrow">CENTRO DE OPERAÇÕES</p><h1>Sua jornada ainda não começou</h1></header>
      ${emptyState('Nenhuma obra selecionada', 'Monte sua lista no catálogo ou comece por uma das seleções prontas abaixo.')}
      <div class="presets">${Object.entries(PRESETS).map(([k, p]) => `<button class="preset" data-action="preset" data-value="${k}"><strong>${esc(p.label)}</strong><span>${esc(p.desc)}</span><em>${p.ids.length} obras</em></button>`).join('')}</div>
      <p class="center"><a class="btn ghost" href="#/catalogo">Abrir catálogo</a> <button class="btn ghost" data-action="journey" data-value="doomsday">Usar a jornada Doomsday Protocol</button></p></section>`;
  }

  const next = s.next;
  const nextIt = next ? store.item(next.id) : null;
  const phases = groupProgress(store, 'phase');
  const sagas = groupProgress(store, 'saga');
  const tiles = [
    ['Selecionadas', s.total], ['Concluídas', s.watched], ['Em andamento', s.progress], ['Não assistidas', s.unwatched],
    ['Reassistidas', s.rewatches], ['Já vistas antes', s.before], ['Média das notas', s.avg != null ? s.avg.toFixed(1) : '—'], ['Tempo restante', s.minutesLeft ? `~${fmtHours(s.minutesLeft)}` : '—'],
  ];

  return `<section class="view">
    <header class="view-head"><p class="eyebrow">CENTRO DE OPERAÇÕES · ${mode === 'doomsday' ? 'PROTOCOLO DOOMSDAY' : 'JORNADA COMPLETA'}</p>
      <h1>Painel de ${esc(ctx.profiles.active.name)}</h1>
      <div class="seg small" role="group" aria-label="Jornada ativa">
        <button class="${mode === 'full' ? 'on' : ''}" data-action="journey" data-value="full" aria-pressed="${mode === 'full'}">Minha jornada</button>
        <button class="${mode === 'doomsday' ? 'on' : ''}" data-action="journey" data-value="doomsday" aria-pressed="${mode === 'doomsday'}">Doomsday Protocol</button>
      </div></header>

    <div class="grid dash">
      <div class="panel hero-progress">${ring}<div class="ring-label"><strong>${s.pct}%</strong><span>${s.watched} de ${s.total}</span></div>
        <div><h2>Progresso geral</h2><p class="muted">${mode === 'doomsday' ? 'Obras da curadoria Doomsday nos níveis escolhidos.' : 'Obras da sua lista pessoal.'}</p></div></div>

      <div class="panel next-up">${next ? `<div class="next-cover">${cover(next, ctx.external.cached(next)?.poster)}</div>
        <div><p class="eyebrow">${nextIt.status === 'progress' ? 'EM ANDAMENTO' : 'PRÓXIMA MISSÃO'}</p><h2>${esc(next.t)}</h2>
        <p class="muted">${esc(duration(next))} · Fase ${next.phase} · ${statusBadge(nextIt, next)}</p><p>${esc(next.syn)}</p>
        <div class="row wrap gap-s"><button class="btn primary" data-action="open" data-id="${next.id}">Abrir arquivo</button>
        ${nextIt.status !== 'progress' ? `<button class="btn ghost" data-action="status" data-id="${next.id}" data-value="progress">Começar agora</button>` : `<button class="btn ghost" data-action="status" data-id="${next.id}" data-value="watched">Concluir</button>`}</div></div>`
        : emptyState('Missão cumprida', 'Não há obras lançadas pendentes nesta jornada.')}</div>

      <div class="tiles">${tiles.map(([l, v]) => `<div class="tile"><span class="tile-v">${esc(v)}</span><span class="tile-l">${esc(l)}</span></div>`).join('')}</div>

      <div class="panel"><h3>Última obra assistida</h3>${s.last ? `<button class="last-watched" data-action="open" data-id="${s.last.work.id}">
        <strong>${esc(s.last.work.t)}</strong><span class="muted">${esc(fmtDate(s.last.h.date))}${s.last.h.kind === 'rewatch' ? ' · reassistida' : ''}${s.last.h.rating != null ? ` · ${s.last.h.rating}/10` : ''}</span></button>` : '<p class="muted">Nenhuma visualização registrada ainda.</p>'}</div>

      <div class="panel"><h3>Progresso por fase</h3>${phases.map((g) => bar(`Fase ${g.key}`, g.watched, g.total)).join('') || '<p class="muted">Sem obras.</p>'}</div>
      <div class="panel"><h3>Progresso por saga</h3>${sagas.map((g) => bar(sagaLabel(g.key), g.watched, g.total)).join('') || '<p class="muted">Sem obras.</p>'}
        <p class="tiny muted">${Object.values(SAGAS).map((x) => `${esc(x.label)}: fases ${x.phases.join(', ')}`).join(' · ')}</p></div>
      <div class="panel wide"><h3>Evolução</h3>${evolutionChart(watchTimeline(store))}</div>
    </div></section>`;
}
