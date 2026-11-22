/**
 * Abertura original: autenticação no terminal → linhas do tempo convergem →
 * símbolo se forma → título → abre o painel.
 *
 * - Aparece uma vez por sessão, pode ser pulada e respeita "reduzir movimento".
 * - Sem som: ~5 s. Com som e voz: o tempo se ajusta à duração dos áudios
 *   (fase A = terminal, fase B = "acesso concedido"), em torno de 7 s.
 * - Com o som ligado, o navegador exige um clique para liberar o áudio. Então
 *   a abertura espera numa tela de autenticação ("toque para autenticar").
 */
import { emblem } from './emblem.js';
import { esc } from './dom.js';
import { sfx } from './sound.js';

const KEY = 'mcuarchive:intro-seen';
const BASE_A = 1.8;      // duração da fase A sem voz (s)
const MAX_TOTAL = 12;    // trava de segurança (s)

export const VOICE_LINES = {
  classic: { a: 'Conectando ao arquivo central. Credenciais verificadas.', b: 'Acesso concedido. Bem-vindo ao arquivo.' },
  doomsday: { a: 'Protocolo Doomsday ativo. Varredura multiversal em andamento.', b: 'Incursão detectada. Acesso concedido.' },
};

const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
const sec = (n) => `${n.toFixed(2)}s`;

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
    const threads = Array.from({ length: 14 }, (_, i) => `<i style="--a:${(i / 14) * 360}deg;--d:${(i % 5) * 0.06}s"></i>`).join('');

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
      <div class="intro-gate" aria-hidden="true"><p>ACESSO RESTRITO</p><button class="intro-gate-btn" type="button">▶ Toque para autenticar</button></div>
      <button class="intro-skip" type="button">Pular ▸</button>`;
    document.body.appendChild(el);
    document.body.classList.add('intro-lock');

    let done = false, started = false;
    const timers = [];
    const after = (s, fn) => timers.push(setTimeout(fn, s * 1000));
    const finish = () => {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      sfx.stopVoice();
      el.classList.add('intro-out');
      document.body.classList.remove('intro-lock');
      removeEventListener('keydown', onKey);
      setTimeout(() => { el.remove(); resolve(); }, reduce ? 150 : 650);
    };

    const wantSound = sfx.on && !reduce;
    let dA = null, dB = null;

    const begin = () => {
      if (started || done) return;
      started = true;
      el.classList.remove('intro-waiting');
      const tA = dA ? dA + 0.25 : BASE_A;
      const step = Math.max(0.42, (tA - 0.5) / lines.length);
      const threadsAt = tA - 0.3;
      const flashAt = threadsAt + 1.2;
      const emblemAt = flashAt + 0.1;
      const titleAt = emblemAt + 0.6;
      const subAt = titleAt + 0.4;
      const endAt = Math.min(MAX_TOTAL, Math.max(subAt + 1.2, dB ? flashAt + dB + 0.7 : 0));
      const v = { '--step': sec(step), '--fade-at': sec(tA + 0.1), '--threads-at': sec(threadsAt), '--flash-at': sec(flashAt), '--emblem-at': sec(emblemAt), '--title-at': sec(titleAt), '--sub-at': sec(subAt) };
      Object.entries(v).forEach(([k, val]) => el.style.setProperty(k, val));
      el.classList.add('run');
      if (reduce) { after(0.7, finish); return; }
      if (wantSound) {
        sfx.play('boot');
        if (dA) sfx.playVoice(`intro-${theme}-a`, 0.15);
        after(flashAt, () => { sfx.play('flash'); if (dB) sfx.playVoice(`intro-${theme}-b`); });
        after(emblemAt + 0.75, () => sfx.play('ding'));
      }
      after(endAt, finish);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(); return; }
      if (['Enter', ' '].includes(e.key)) { e.preventDefault(); if (!started) gate(); else finish(); }
    };
    addEventListener('keydown', onKey);

    /** Clique na tela de autenticação: libera o áudio e começa. */
    const gate = async () => {
      if (started) return;
      await sfx.unlock();
      begin();
    };

    el.addEventListener('click', (e) => {
      if (e.target.closest('.intro-skip')) { finish(); return; }
      if (!started) gate(); else finish();
    });
    el.querySelector('.intro-skip').focus({ preventScroll: true });

    (async () => {
      if (!wantSound) { begin(); return; }
      // som ligado: carrega as vozes (se existirem) enquanto a tela espera
      el.classList.add('intro-waiting');
      if (sfx.useVoice) {
        sfx.ensure();
        const [a, b] = await Promise.all([withTimeout(sfx.loadVoice(`intro-${theme}-a`), 2500), withTimeout(sfx.loadVoice(`intro-${theme}-b`), 2500)]);
        dA = a?.duration ?? null; dB = b?.duration ?? null;
      }
      if (done) return;
      if (sfx.running) begin();        // o navegador já liberou o áudio
      else el.querySelector('.intro-gate-btn').focus({ preventScroll: true }); // espera o clique
    })();
  });
}
