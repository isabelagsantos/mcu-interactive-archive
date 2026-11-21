/** Utilitários de interface. */
import { TYPES, SAGAS } from '../catalog/catalog.js';
import { isUpcoming } from '../core/selectors.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function fmtDate(d) {
  if (!d) return '—';
  const s = String(d);
  if (s.length === 4) return `${s} (data a confirmar)`;
  const [y, m, day] = s.split('-');
  return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`;
}
export const fmtHours = (min) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`);
export const duration = (w) => (w.min ? fmtHours(w.min) : w.eps ? `${w.eps} episódios` : w.type === 'filme' || w.type === 'especial' ? 'Duração indisponível' : 'Nº de episódios a confirmar');
export const typeLabel = (w) => TYPES[w.type] || w.type;
export const sagaLabel = (s) => SAGAS[s]?.label || s;
export const missionId = (w) => `MCU-${w.phase}${String(w.chrono ?? 0).padStart(2, '0')}-${w.id.slice(0, 3).toUpperCase()}`;

export function statusBadge(it, w) {
  if (w && isUpcoming(w)) return '<span class="badge badge-soon">Em breve</span>';
  if (it.status === 'watched') return '<span class="badge badge-done">Assistida</span>';
  if (it.status === 'progress') return `<span class="badge badge-prog">${it.mode === 'rewatch' ? 'Reassistindo' : 'Em andamento'}</span>`;
  return '<span class="badge badge-none">Não assistida</span>';
}

export function toast(msg, kind = 'info') {
  const host = $('#toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', 'status');
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
}

/** Diálogo de confirmação acessível. Retorna Promise<boolean>. */
export function confirmDialog({ title, body, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    const dlg = $('#confirm');
    dlg.innerHTML = `<form method="dialog" class="confirm-box">
      <h2>${esc(title)}</h2><p>${esc(body)}</p>
      <div class="row end"><button value="no" class="btn ghost">Cancelar</button>
      <button value="yes" class="btn ${danger ? 'danger' : 'primary'}">${esc(confirmLabel)}</button></div></form>`;
    dlg.onclose = () => resolve(dlg.returnValue === 'yes');
    dlg.returnValue = '';
    dlg.showModal();
  });
}

export function emptyState(title, text, actionHTML = '') {
  return `<div class="empty"><div class="empty-icon" aria-hidden="true">◎</div><h3>${esc(title)}</h3><p>${esc(text)}</p>${actionHTML}</div>`;
}

/** Capa gerada (fallback quando não há pôster). */
export function cover(w, poster) {
  const img = poster ? `<img src="${esc(poster)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : '';
  const st = isUpcoming(w) ? '<span class="stamp stamp-soon">EM BREVE</span>' : w.tier === 'e' ? '<span class="stamp stamp-alert">PRIORIDADE ALFA</span>' : '';
  return `<div class="cover phase-${w.phase} type-${w.type}" data-work="${esc(w.id)}" aria-hidden="true">
    <svg class="cover-glyph" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38"/><circle cx="50" cy="50" r="26"/><ellipse cx="50" cy="50" rx="44" ry="14" transform="rotate(${(w.phase * 37) % 180} 50 50)"/><path d="M50 30 L62 50 L50 70 L38 50Z"/></svg>
    ${st}<div class="cover-art"><div class="cover-head"><span class="cover-id">${esc(missionId(w))}</span><span class="cover-class">CLASSIFICADO · NÍVEL ${w.phase}</span></div>
      <span class="cover-type">${esc(typeLabel(w))}</span>
      <strong class="cover-title">${esc(w.t)}</strong>
      <span class="cover-year">${esc(w.year)} · FASE ${w.phase}</span></div>${img}</div>`;
}
