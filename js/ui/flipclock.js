/**
 * Contagem regressiva em estilo flip clock (placar de aeroporto) para a
 * estreia de Avengers: Doomsday. Usa o relógio e o fuso do aparelho: a
 * contagem termina à meia-noite local do dia de estreia.
 * Funciona igual em qualquer tema.
 */
import { BY_ID } from '../catalog/catalog.js';
import { fmtDate } from './dom.js';

const UNITS = [['days', 'Dias'], ['hours', 'Horas'], ['minutes', 'Minutos'], ['seconds', 'Segundos']];
const FLIP_MS = 560;
const pad = (n, len) => String(n).padStart(len, '0');

export function doomsdayTarget() {
  const [y, m, d] = BY_ID.doomsday.date.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0).getTime();
}

export function split(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

const digitLen = (unit, value) => (unit === 'days' ? Math.max(2, String(value).length) : 2);
const spoken = (v) => `Faltam ${v.days} dias, ${v.hours} horas e ${v.minutes} minutos para Avengers: Doomsday`;
const digitHTML = (ch) => `<span class="flip" data-v="${ch}"><span class="fl-top"><i>${ch}</i></span><span class="fl-bottom"><i>${ch}</i></span></span>`;
const doneHTML = '<div class="flipclock is-done" role="status"><strong>EM CARTAZ</strong><span>Avengers: Doomsday já estreou</span></div>';

/** HTML inicial. Depois de inserido, tickFlipClocks() cuida das atualizações. */
export function flipClock() {
  const target = doomsdayTarget();
  const rem = target - Date.now();
  if (rem <= 0) return doneHTML;
  const v = split(rem);
  const groups = UNITS.map(([k, label]) => `<div class="fc-group" data-unit="${k}"><div class="fc-digits">${[...pad(v[k], digitLen(k, v[k]))].map(digitHTML).join('')}</div><span class="fc-label">${label}</span></div>`);
  return `<div class="flipclock" role="timer" data-target="${target}" aria-label="${spoken(v)}">${groups.join('<span class="fc-sep" aria-hidden="true">:</span>')}</div>`;
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function finalize(f) {
  const flap = f.querySelector('.fl-flap');
  if (!flap) return;
  f.querySelector('.fl-bottom i').textContent = f.dataset.v;
  flap.remove();
}

function setDigit(f, ch) {
  if (f.dataset.v === ch) return;
  finalize(f);
  const old = f.dataset.v;
  f.dataset.v = ch;
  const top = f.querySelector('.fl-top i');
  const bottom = f.querySelector('.fl-bottom i');
  top.textContent = ch;
  if (reduced()) { bottom.textContent = ch; return; }
  const flap = document.createElement('span');
  flap.className = 'fl-flap';
  flap.innerHTML = `<span class="fl-front"><i>${old}</i></span><span class="fl-back"><i>${ch}</i></span>`;
  f.appendChild(flap);
  setTimeout(() => { if (flap.isConnected) { bottom.textContent = f.dataset.v; flap.remove(); } }, FLIP_MS);
}

export function tickFlipClocks() {
  document.querySelectorAll('.flipclock[data-target]').forEach((el) => {
    const rem = Number(el.dataset.target) - Date.now();
    if (rem <= 0) { el.outerHTML = doneHTML; return; }
    const v = split(rem);
    for (const [k] of UNITS) {
      const group = el.querySelector(`[data-unit="${k}"] .fc-digits`);
      if (!group) continue;
      const str = pad(v[k], digitLen(k, v[k]));
      if (group.children.length !== str.length) { group.innerHTML = [...str].map(digitHTML).join(''); continue; }
      [...group.children].forEach((f, i) => setDigit(f, str[i]));
    }
    if (v.seconds === 0 || !el.dataset.said) { el.setAttribute('aria-label', spoken(v)); el.dataset.said = '1'; } // leitor de tela: 1 vez por minuto
  });
}

let started = false;
/** Liga o relógio global (uma vez), alinhado ao início de cada segundo. */
export function startFlipClocks() {
  if (started) return;
  started = true;
  const loop = () => { tickFlipClocks(); setTimeout(loop, 1000 - (Date.now() % 1000) + 5); };
  loop();
}

export function countdownPanel() {
  if (doomsdayTarget() - Date.now() <= 0) return '';
  return `<div class="panel wide countdown"><div class="cd-head"><p class="eyebrow">⚠ CONTAGEM REGRESSIVA</p><h2>${BY_ID.doomsday.t}</h2></div>
    ${flipClock()}<p class="muted tiny center">Estreia em ${fmtDate(BY_ID.doomsday.date)} · no horário do seu aparelho</p></div>`;
}
