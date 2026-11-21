/**
 * Mapa de conexões narrativas: cada coluna é uma fase, cada nó uma obra,
 * e as curvas ligam obras conectadas. Passar o mouse/foco destaca a rede.
 */
import { RELEASE_ORDER, BY_ID } from '../../catalog/catalog.js';
import { isUpcoming } from '../../core/selectors.js';
import { esc } from '../dom.js';

const COL_W = 210, ROW_H = 34, TOP = 60, LEFT = 24, NODE_W = 170;

function state(ctx, w) {
  const it = ctx.store.item(w.id);
  if (isUpcoming(w)) return 'n-soon';
  if (it.status === 'watched') return 'n-done';
  if (it.status === 'progress') return 'n-prog';
  if (it.selected) return 'n-sel';
  return 'n-out';
}

export function render(ctx) {
  const pos = {};
  const cols = [1, 2, 3, 4, 5, 6].map((p) => RELEASE_ORDER.filter((w) => w.phase === p));
  cols.forEach((ws, c) => ws.forEach((w, r) => { pos[w.id] = { x: LEFT + c * COL_W, y: TOP + r * ROW_H }; }));
  const H = TOP + Math.max(...cols.map((c) => c.length)) * ROW_H + 20;
  const Wd = LEFT * 2 + 5 * COL_W + NODE_W;
  const seen = new Set(), edges = [];
  for (const w of RELEASE_ORDER) for (const l of w.links) {
    if (!pos[l]) continue;
    const k = [w.id, l].sort().join('|');
    if (seen.has(k)) continue; seen.add(k);
    const [a, b] = pos[w.id].x <= pos[l].x ? [w.id, l] : [l, w.id];
    const A = pos[a], B = pos[b];
    const x1 = A.x + NODE_W, y1 = A.y + 12, x2 = B.x, y2 = B.y + 12;
    const d = A.x === B.x
      ? `M${A.x + NODE_W} ${y1} C ${A.x + NODE_W + 40} ${y1}, ${A.x + NODE_W + 40} ${y2}, ${A.x + NODE_W} ${y2}`
      : `M${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
    edges.push(`<path class="edge" data-a="${a}" data-b="${b}" d="${d}"/>`);
  }
  const nodes = RELEASE_ORDER.map((w) => {
    const p = pos[w.id];
    return `<g class="mnode ${state(ctx, w)}" data-node="${w.id}" data-action="open" data-id="${w.id}" tabindex="0" role="button" aria-label="${esc(w.t)}" transform="translate(${p.x} ${p.y})">
      <rect width="${NODE_W}" height="24" rx="5"/><circle cx="11" cy="12" r="4"/>
      <text x="22" y="16">${esc(w.t.length > 24 ? `${w.t.slice(0, 23)}…` : w.t)}</text><title>${esc(w.t)}</title></g>`;
  }).join('');
  const heads = [1, 2, 3, 4, 5, 6].map((p, i) => `<text class="mhead" x="${LEFT + i * COL_W}" y="34">FASE ${p}</text>`).join('');

  return `<section class="view"><header class="view-head"><p class="eyebrow">REDE NARRATIVA · ${edges.length} CONEXÕES</p><h1>Mapa de conexões</h1>
    <p class="muted">Cada coluna é uma fase, em ordem de lançamento. Passe o mouse ou o foco sobre uma obra para ver com quais outras ela se conecta. Clique para abrir o arquivo.</p>
    <ul class="legend" aria-label="Legenda"><li class="n-done">Assistida</li><li class="n-prog">Em andamento</li><li class="n-sel">Selecionada</li><li class="n-out">Fora da jornada</li><li class="n-soon">Em breve</li></ul></header>
    <div class="map-wrap panel"><svg class="map" viewBox="0 0 ${Wd} ${H}" width="${Wd}" height="${H}" role="group" aria-label="Mapa de conexões entre obras">
      ${heads}<g class="edges">${edges.join('')}</g><g class="nodes">${nodes}</g></svg></div></section>`;
}

export function mount(ctx, root) {
  const svg = root.querySelector('.map');
  if (!svg) return;
  const set = (id) => {
    svg.classList.toggle('hl-on', !!id);
    svg.querySelectorAll('.hl').forEach((n) => n.classList.remove('hl'));
    if (!id) return;
    svg.querySelector(`[data-node="${id}"]`)?.classList.add('hl');
    svg.querySelectorAll(`.edge[data-a="${id}"], .edge[data-b="${id}"]`).forEach((e) => {
      e.classList.add('hl');
      svg.querySelector(`[data-node="${e.dataset.a === id ? e.dataset.b : e.dataset.a}"]`)?.classList.add('hl');
    });
  };
  svg.addEventListener('mouseover', (e) => set(e.target.closest('.mnode')?.dataset.node));
  svg.addEventListener('mouseleave', () => set(null));
  svg.addEventListener('focusin', (e) => set(e.target.closest('.mnode')?.dataset.node));
  svg.addEventListener('focusout', () => set(null));
  svg.addEventListener('keydown', (e) => {
    const n = e.target.closest('.mnode');
    if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); n.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  });
}
