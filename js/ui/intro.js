/**
 * Abertura original: autenticação no terminal → linhas do tempo convergem →
 * emblema se forma → título → abre o painel.
 * Aparece uma vez por sessão, pode ser pulada e respeita "reduzir movimento".
 */
import { emblem } from './emblem.js';
import { esc } from './dom.js';

const KEY = 'mcuarchive:intro-seen';

export function playIntro({ agent = 'Agente', theme = 'classic', force = false } = {}) {
  return new Promise((resolve) => {
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === '1'; } catch { /* ignora */ }
    if (seen && !force) { resolve(); return; }
    try { sessionStorage.setItem(KEY, '1'); } catch { /* ignora */ }

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doom = theme === 'doomsday';
    const lines = doom
      ? ['> PROTOCOLO DOOMSDAY // CANAL SEGURO', `> AGENTE: ${agent.toUpperCase()}`, '> VARREDURA MULTIVERSAL… INCURSÃO DETECTADA', '> ACESSO CONCEDIDO']
      : ['> CONECTANDO AO ARQUIVO CENTRAL', `> AGENTE: ${agent.toUpperCase()}`, '> VERIFICANDO CREDENCIAIS… OK', '> ACESSO CONCEDIDO'];
    const threads = Array.from({ length: 14 }, (_, i) => {
      const a = (i / 14) * 360;
      return `<i style="--a:${a}deg;--d:${(i % 5) * 0.06}s"></i>`;
    }).join('');

    const el = document.createElement('div');
    el.className = `intro ${doom ? 'intro-doom' : ''} ${reduce ? 'intro-reduced' : ''}`;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Abertura do MCU Interactive Archive');
    el.innerHTML = `
      <div class="intro-term" aria-hidden="true">${lines.map((l, i) => `<p style="--i:${i}">${esc(l)}</p>`).join('')}</div>
      <div class="intro-threads" aria-hidden="true">${threads}</div>
      <div class="intro-flash" aria-hidden="true"></div>
      <div class="intro-core">${emblem({ size: 150, cls: 'intro-emblem' })}
        <h1 class="intro-title"><span>MCU</span> Interactive Archive</h1>
        <p class="intro-sub">${doom ? 'MONITORAMENTO MULTIVERSAL ATIVO' : 'ARQUIVO CINEMATOGRÁFICO PESSOAL'}</p></div>
      <button class="intro-skip" type="button">Pular ▸</button>`;
    document.body.appendChild(el);
    document.body.classList.add('intro-lock');

    let done = false;
    const finish = () => {
      if (done) return; done = true;
      el.classList.add('intro-out');
      document.body.classList.remove('intro-lock');
      removeEventListener('keydown', onKey);
      setTimeout(() => { el.remove(); resolve(); }, reduce ? 150 : 650);
    };
    const onKey = (e) => { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); finish(); } };
    el.addEventListener('click', finish);
    addEventListener('keydown', onKey);
    el.querySelector('.intro-skip').focus({ preventScroll: true });
    setTimeout(finish, reduce ? 700 : 5000);
  });
}
