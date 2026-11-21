import { ERAS, PHASE_EVENTS, CHRONO_ORDER, RELEASE_ORDER, BY_ID } from '../../catalog/catalog.js';
import { isUpcoming } from '../../core/selectors.js';
import { esc, fmtDate, typeLabel, sagaLabel } from '../dom.js';

function nodeClass(ctx, w) {
  const it = ctx.store.item(w.id);
  if (isUpcoming(w)) return 'n-soon';
  if (it.status === 'watched') return 'n-done';
  if (it.status === 'progress') return 'n-prog';
  if (it.selected) return 'n-sel';
  return 'n-out';
}

const node = (ctx, w, mode) => `<li class="tl-node ${nodeClass(ctx, w)}" data-node="${w.id}" data-links="${esc([...w.links, ...Object.values(BY_ID).filter((x) => x.links.includes(w.id)).map((x) => x.id)].join(' '))}">
  <button data-action="open" data-id="${w.id}"><span class="tl-dot" aria-hidden="true"></span>
  <span class="tl-when">${mode === 'chrono' ? `#${w.chrono}` : esc(fmtDate(w.date))}</span>
  <strong>${esc(w.t)}</strong><span class="tl-meta">${esc(typeLabel(w))} · Fase ${w.phase}${w.alt ? ' · universo alternativo' : ''}</span></button></li>`;

export function render(ctx) {
  const mode = ctx.ui.tlMode;
  const onlyMine = ctx.ui.tlOnlyMine;
  const keep = (w) => !onlyMine || ctx.store.item(w.id).selected || ctx.store.item(w.id).status !== 'unwatched';
  let groups;
  if (mode === 'chrono') {
    groups = ERAS.map((e) => ({ title: e.label, sub: e.range, events: e.events, works: CHRONO_ORDER.filter((w) => w.era === e.id && w.chrono && keep(w)) }));
    groups.push({ title: 'Universos à parte', sub: 'Sem posição fixa na linha principal', events: ['Animações de outros universos'], works: CHRONO_ORDER.filter((w) => !w.chrono && keep(w)) });
  } else {
    groups = [1, 2, 3, 4, 5, 6].map((p) => ({ title: `Fase ${p}`, sub: sagaLabel(p <= 3 ? 'infinito' : 'multiverso'), events: PHASE_EVENTS[p], works: RELEASE_ORDER.filter((w) => w.phase === p && keep(w)) }));
  }
  return `<section class="view"><header class="view-head"><p class="eyebrow">MONITOR TEMPORAL</p><h1>Linha do tempo</h1>
    <div class="row wrap gap-s"><div class="seg small" role="group" aria-label="Modo da linha do tempo">
      <button class="${mode === 'release' ? 'on' : ''}" data-action="tl-mode" data-value="release" aria-pressed="${mode === 'release'}">Ordem de lançamento</button>
      <button class="${mode === 'chrono' ? 'on' : ''}" data-action="tl-mode" data-value="chrono" aria-pressed="${mode === 'chrono'}">Ordem cronológica</button></div>
      <label class="toggle"><input type="checkbox" data-action="tl-mine" ${onlyMine ? 'checked' : ''}> Só a minha jornada</label></div>
    <ul class="legend" aria-label="Legenda"><li class="n-done">Assistida</li><li class="n-prog">Em andamento</li><li class="n-sel">Selecionada</li><li class="n-out">Fora da jornada</li><li class="n-soon">Em breve</li></ul>
    <p class="tiny muted">Passe o mouse ou o foco sobre uma obra para destacar as conexões narrativas.${mode === 'chrono' ? ' A cronologia segue a ordem mais aceita entre os fãs, e as posições são aproximadas.' : ''}</p></header>
    <div class="timeline">${groups.filter((g) => g.works.length).map((g) => `<section class="tl-group"><header class="tl-head"><h2>${esc(g.title)}</h2><span class="muted">${esc(g.sub)}</span>
      <ul class="tl-events">${g.events.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></header>
      <ol class="tl-list">${g.works.map((w) => node(ctx, w, mode)).join('')}</ol></section>`).join('') || '<p class="muted">Nenhuma obra da sua jornada ainda.</p>'}</div></section>`;
}

export function mount(ctx, root) {
  const tl = root.querySelector('.timeline');
  if (!tl) return;
  const set = (id) => {
    tl.classList.toggle('hl-on', !!id);
    tl.querySelectorAll('.tl-node').forEach((n) => n.classList.remove('hl', 'hl-src'));
    if (!id) return;
    const src = tl.querySelector(`[data-node="${id}"]`);
    if (!src) return;
    src.classList.add('hl-src');
    src.dataset.links.split(' ').filter(Boolean).forEach((l) => tl.querySelector(`[data-node="${l}"]`)?.classList.add('hl'));
  };
  tl.addEventListener('mouseover', (e) => set(e.target.closest('.tl-node')?.dataset.node));
  tl.addEventListener('mouseleave', () => set(null));
  tl.addEventListener('focusin', (e) => set(e.target.closest('.tl-node')?.dataset.node));
  tl.addEventListener('focusout', () => set(null));
}
