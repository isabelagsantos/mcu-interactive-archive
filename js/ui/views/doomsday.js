import { CHRONO_ORDER, RELEASE_ORDER, TIERS, BY_ID } from '../../catalog/catalog.js';
import { isUpcoming } from '../../core/selectors.js';
import { flipClock } from '../flipclock.js';
import { esc, fmtDate, duration, statusBadge, fmtHours } from '../dom.js';

export function render(ctx) {
  const { store } = ctx;
  const order = store.prefs.order === 'release' ? RELEASE_ORDER : CHRONO_ORDER;
  const tiers = store.prefs.doomsdayTiers;
  const active = store.prefs.journey === 'doomsday';
  const block = (t) => {
    const ws = order.filter((w) => w.tier === t);
    const done = ws.filter((w) => store.item(w.id).status === 'watched').length;
    const mins = ws.filter((w) => store.item(w.id).status !== 'watched' && !isUpcoming(w)).reduce((a, w) => a + (w.min || (w.eps || 0) * 45), 0);
    return `<section class="panel dd-tier tier-${t}"><header class="row between wrap"><div><p class="eyebrow">NÍVEL ${t === 'e' ? 'ALFA' : t === 'r' ? 'BETA' : 'GAMA'}</p>
      <h2>${esc(TIERS[t].label)}s <small>${done}/${ws.length}</small></h2><p class="muted">${esc(TIERS[t].desc)}${mins ? ` Restam cerca de ${fmtHours(mins)}.` : ''}</p></div>
      <label class="toggle"><input type="checkbox" data-action="dd-tier" data-value="${t}" ${tiers.includes(t) ? 'checked' : ''}> Incluir na jornada</label></header>
      <ol class="dd-list">${ws.map((w) => { const it = store.item(w.id); return `<li class="st-${it.status}"><button data-action="open" data-id="${w.id}">
        <span class="dd-name">${esc(w.t)}</span><span class="muted tiny">${esc(duration(w))} · ${esc(fmtDate(w.date))}</span></button>${statusBadge(it, w)}
        <button class="icon-btn" data-action="status" data-id="${w.id}" data-value="${it.status === 'watched' ? 'unwatched' : 'watched'}" ${isUpcoming(w) ? 'disabled' : ''} aria-label="${it.status === 'watched' ? 'Desmarcar' : 'Marcar como assistida'}: ${esc(w.t)}">${it.status === 'watched' ? '◉' : '◯'}</button></li>`; }).join('')}</ol></section>`;
  };
  return `<section class="view doomsday-view"><header class="view-head"><p class="eyebrow blink">⚠ PROTOCOLO ATIVO</p>
    <h1>Doomsday Protocol</h1><p>Jornada preparatória para <strong>Vingadores: Doomsday</strong> (${esc(fmtDate(BY_ID.doomsday.date))}). Uma seleção editorial em três níveis.</p>
    <div class="countdown-inline">${flipClock()}</div>
    <div class="notice" role="note"><strong>Curadoria narrativa.</strong> Esta classificação é uma seleção editorial baseada nas tramas já lançadas. Ela não confirma a participação de personagens nem os acontecimentos do filme.</div>
    <div class="row wrap gap-s"><div class="seg small" role="group" aria-label="Jornada ativa">
      <button class="${!active ? 'on' : ''}" data-action="journey" data-value="full" aria-pressed="${!active}">Minha jornada completa</button>
      <button class="${active ? 'on' : ''}" data-action="journey" data-value="doomsday" aria-pressed="${active}">Jornada preparatória</button></div>
      <div class="seg small" role="group" aria-label="Ordem"><button class="${store.prefs.order === 'chrono' ? 'on' : ''}" data-action="order" data-value="chrono">Cronológica</button>
      <button class="${store.prefs.order === 'release' ? 'on' : ''}" data-action="order" data-value="release">Lançamento</button></div>
      <button class="btn ghost small" data-action="dd-to-list">Copiar níveis marcados para minha lista</button></div></header>
    ${['e', 'r', 'c'].map(block).join('')}
    <section class="panel dd-target"><p class="eyebrow">ALVO</p><h2>${esc(BY_ID.doomsday.t)}</h2><p>${esc(BY_ID.doomsday.syn)}</p>
      <button class="btn primary" data-action="open" data-id="doomsday">Abrir arquivo</button></section></section>`;
}
