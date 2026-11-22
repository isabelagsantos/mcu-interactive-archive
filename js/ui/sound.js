/**
 * Som do site: efeitos sintetizados (Web Audio, sem arquivos) e voz da abertura.
 *
 * - Tudo vem DESLIGADO por padrão (DEFAULTS.on). A pessoa liga no botão de som.
 * - Efeitos são gerados por osciladores, então não pesam no carregamento.
 * - A voz são arquivos MP3 simples em /audio (gerados com edge-tts, veja
 *   tools/gerar_voz.py). O efeito robótico é aplicado aqui, no navegador.
 * - Navegadores só liberam áudio depois de um clique. Por isso o som liga
 *   a partir de um gesto (botão de som ou tela de autenticação da abertura).
 */
import { JsonStore } from '../core/storage.js';

const KEY = 'prefs:sound';
export const DEFAULTS = { on: false, voice: true, volume: 0.7 };

// ---------- blocos de construção ----------
function tone(c, out, { type = 'square', f0 = 440, f1 = null, t = 0, d = 0.08, g = 0.12, att = 0.004, lp = null }) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + d);
  const v = c.createGain();
  v.gain.setValueAtTime(0.0001, t);
  v.gain.exponentialRampToValueAtTime(g, t + att);
  v.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(v);
  let tail = v;
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; v.connect(f); tail = f; }
  tail.connect(out);
  o.start(t); o.stop(t + d + 0.03);
}

function noise(c, out, { t = 0, d = 0.2, g = 0.1, f0 = 800, f1 = 4000, q = 1, type = 'bandpass' }) {
  const len = Math.max(1, Math.floor(c.sampleRate * d));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
  const v = c.createGain();
  v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(v); v.connect(out);
  s.start(t);
}

// ---------- efeitos (c = contexto, out = saída, t = instante de início) ----------
export const EFFECTS = {
  tap:   (c, o, t) => { tone(c, o, { f0: 1300, f1: 900, t, d: 0.04, g: 0.07 }); tone(c, o, { f0: 700, f1: 700, t: t + 0.03, d: 0.03, g: 0.04, type: 'sine' }); },
  on:    (c, o, t) => { tone(c, o, { f0: 600, f1: 1250, t, d: 0.09, g: 0.09, lp: 5000 }); tone(c, o, { f0: 1250, f1: 1250, t: t + 0.09, d: 0.05, g: 0.06, type: 'sine' }); },
  off:   (c, o, t) => { tone(c, o, { f0: 1000, f1: 450, t, d: 0.1, g: 0.09, lp: 4000 }); },
  open:  (c, o, t) => { tone(c, o, { type: 'sawtooth', f0: 260, f1: 1500, t, d: 0.16, g: 0.06, lp: 3500 }); noise(c, o, { t, d: 0.16, g: 0.05, f0: 500, f1: 5000, q: 2 }); tone(c, o, { f0: 1800, f1: 1800, t: t + 0.15, d: 0.04, g: 0.05, type: 'sine' }); },
  close: (c, o, t) => { tone(c, o, { type: 'sawtooth', f0: 1300, f1: 240, t, d: 0.13, g: 0.05, lp: 3000 }); noise(c, o, { t, d: 0.12, g: 0.035, f0: 4000, f1: 400, q: 2 }); },
  nav:   (c, o, t) => { tone(c, o, { f0: 1500, f1: 1500, t, d: 0.025, g: 0.07 }); tone(c, o, { f0: 1000, f1: 1000, t: t + 0.04, d: 0.03, g: 0.06 }); },
  route: (c, o, t) => { tone(c, o, { type: 'sine', f0: 640, f1: 920, t, d: 0.06, g: 0.08 }); },
  theme_classic: (c, o, t) => { tone(c, o, { type: 'sawtooth', f0: 200, f1: 880, t, d: 0.3, g: 0.06, lp: 2600 }); tone(c, o, { f0: 880, f1: 1320, t: t + 0.22, d: 0.12, g: 0.06, type: 'sine' }); },
  theme_doomsday: (c, o, t) => { tone(c, o, { type: 'sawtooth', f0: 90, f1: 55, t, d: 0.4, g: 0.1, lp: 900 }); for (let i = 0; i < 3; i++) tone(c, o, { f0: 740, f1: 740, t: t + 0.05 + i * 0.12, d: 0.06, g: 0.05 }); },
  complete: (c, o, t) => {
    [523.25, 659.25, 783.99].forEach((f, i) => tone(c, o, { f0: f, f1: f, t: t + i * 0.07, d: 0.09, g: 0.07, lp: 4500 }));
    tone(c, o, { type: 'sine', f0: 120, f1: 50, t: t + 0.2, d: 0.16, g: 0.2 });
    noise(c, o, { t: t + 0.2, d: 0.08, g: 0.06, f0: 3000, f1: 800 });
  },
  success: (c, o, t) => { tone(c, o, { f0: 784, f1: 784, t, d: 0.06, g: 0.07, lp: 4500 }); tone(c, o, { f0: 1175, f1: 1175, t: t + 0.07, d: 0.09, g: 0.07, lp: 4500 }); },
  warn:  (c, o, t) => { tone(c, o, { f0: 220, f1: 200, t, d: 0.1, g: 0.1, lp: 1500 }); tone(c, o, { f0: 220, f1: 190, t: t + 0.14, d: 0.12, g: 0.1, lp: 1500 }); },
  fav:   (c, o, t) => { [1568, 2093, 2637].forEach((f, i) => tone(c, o, { type: 'sine', f0: f, f1: f, t: t + i * 0.045, d: 0.08, g: 0.05 })); },
  xfer:  (c, o, t) => { for (let i = 0; i < 5; i++) tone(c, o, { f0: 700 + i * 140, f1: 700 + i * 140, t: t + i * 0.04, d: 0.035, g: 0.05 }); },
  toggleOn:  (c, o, t) => { tone(c, o, { f0: 440, f1: 880, t, d: 0.08, g: 0.08 }); tone(c, o, { f0: 880, f1: 1760, t: t + 0.09, d: 0.1, g: 0.08, type: 'sine' }); },
  toggleOff: (c, o, t) => { tone(c, o, { f0: 880, f1: 440, t, d: 0.08, g: 0.07 }); },
  boot:  (c, o, t) => { tone(c, o, { type: 'sawtooth', f0: 45, f1: 110, t, d: 0.9, g: 0.08, lp: 400, att: 0.3 }); for (let i = 0; i < 5; i++) tone(c, o, { f0: 1800 + (i % 3) * 300, f1: 1800 + (i % 3) * 300, t: t + 0.15 + i * 0.28, d: 0.025, g: 0.035 }); },
  flash: (c, o, t) => { tone(c, o, { type: 'sine', f0: 60, f1: 200, t, d: 0.6, g: 0.2 }); noise(c, o, { t, d: 0.7, g: 0.12, f0: 300, f1: 7000, q: 0.7 }); },
  ding:  (c, o, t) => { tone(c, o, { type: 'sine', f0: 1760, f1: 1760, t, d: 0.7, g: 0.09, att: 0.01 }); tone(c, o, { type: 'sine', f0: 2637, f1: 2637, t, d: 0.45, g: 0.04, att: 0.01 }); },
};

// ---------- voz robótica ----------
/**
 * Cadeia de efeito para a voz: filtro de rádio + modulação em anel + eco
 * metálico curtíssimo. Recebe qualquer AudioNode de entrada (também serve em
 * OfflineAudioContext, usado nos testes).
 */
export function buildRobotChain(c, input, out) {
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 190;
  const sum = c.createGain();
  const dry = c.createGain(); dry.gain.value = 0.65;
  const ring = c.createGain(); ring.gain.value = 0;
  const osc = c.createOscillator(); osc.frequency.value = 58; osc.connect(ring.gain);
  const wet = c.createGain(); wet.gain.value = 0.55;
  const dly = c.createDelay(0.05); dly.delayTime.value = 0.0085;
  const fb = c.createGain(); fb.gain.value = 0.38;
  const comb = c.createGain(); comb.gain.value = 0.5;
  const peak = c.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 2400; peak.gain.value = 4; peak.Q.value = 0.9;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7200;
  input.connect(hp);
  hp.connect(dry); dry.connect(sum);
  hp.connect(ring); ring.connect(wet); wet.connect(sum);
  hp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(comb); comb.connect(sum);
  sum.connect(peak); peak.connect(lp); lp.connect(out);
  osc.start();
  return { osc, stop() { try { osc.stop(); } catch { /* já parou */ } } };
}

class SoundFX {
  constructor() {
    this.prefs = { ...DEFAULTS };
    this.json = null;
    this.ctx = null; this.master = null;
    this.buffers = new Map();
    this.voice = null;
    this.listeners = new Set();
  }
  load(adapter) {
    this.json = new JsonStore(adapter);
    const saved = this.json.read(KEY, {}) || {};
    this.prefs = { ...DEFAULTS, ...saved };
    this.prefs.on = !!this.prefs.on; this.prefs.voice = this.prefs.voice !== false;
    this.prefs.volume = Math.min(1, Math.max(0, Number(this.prefs.volume) || DEFAULTS.volume));
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  set(key, value) {
    this.prefs[key] = value;
    try { this.json?.write(KEY, this.prefs); } catch { /* preferência é opcional */ }
    if (key === 'volume' && this.master) this.master.gain.value = value;
    this.listeners.forEach((fn) => fn(this.prefs));
  }
  get on() { return this.prefs.on; }
  get useVoice() { return this.prefs.on && this.prefs.voice; }

  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.prefs.volume;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp); comp.connect(this.ctx.destination);
    } catch { this.ctx = null; }
    return this.ctx;
  }
  get running() { return this.ctx?.state === 'running'; }
  /** Precisa ser chamado dentro de um clique ou tecla. */
  async unlock() {
    const c = this.ensure();
    if (!c) return false;
    if (c.state !== 'running') { try { await c.resume(); } catch { /* bloqueado */ } }
    return c.state === 'running';
  }

  play(name) {
    if (!this.prefs.on || !EFFECTS[name]) return;
    const c = this.ensure();
    if (!c) return;
    const fire = () => { try { EFFECTS[name](c, this.master, c.currentTime + 0.005); } catch { /* ignora */ } };
    if (c.state === 'running') fire();
    else c.resume?.().then(fire).catch(() => {});
  }

  // ----- voz -----
  async loadVoice(name) {
    if (this.buffers.has(name)) return this.buffers.get(name);
    const p = (async () => {
      try {
        const c = this.ensure();
        if (!c) return null;
        const r = await fetch(`audio/${name}.mp3`);
        if (!r.ok) return null;
        return await c.decodeAudioData(await r.arrayBuffer());
      } catch { return null; }
    })();
    this.buffers.set(name, p);
    const b = await p;
    if (!b) this.buffers.delete(name); // tenta de novo numa próxima vez
    return b;
  }
  async playVoice(name, delay = 0) {
    const b = await this.loadVoice(name);
    const c = this.ctx;
    if (!b || !c || c.state !== 'running') return null;
    const src = c.createBufferSource(); src.buffer = b;
    const chain = buildRobotChain(c, src, this.master);
    const at = c.currentTime + delay;
    src.start(at);
    src.onended = () => chain.stop();
    this.voice = { src, chain };
    return b.duration;
  }
  stopVoice() {
    if (!this.voice) return;
    try { this.voice.src.stop(); } catch { /* já parou */ }
    this.voice.chain.stop();
    this.voice = null;
  }
}

export const sfx = new SoundFX();
