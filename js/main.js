/**
 * MCU Interactive Archive: inicialização, roteamento por hash e ações globais.
 * A interface lê e escreve dados apenas pelos serviços em js/core.
 */
import { BY_ID, PRESETS, WORKS } from './catalog/catalog.js';
import { createAdapter } from './core/storage.js';
import { ProfileManager } from './core/profiles.js';
import { UserStore, validateBackup } from './core/userStore.js';
import { ExternalData } from './core/external.js';
import { isUpcoming, journeyWorks } from './core/selectors.js';
import { $, esc, toast, confirmDialog } from './ui/dom.js';
import { openModal, closeModal, renderModal } from './ui/modal.js';
import * as dashboard from './ui/views/dashboard.js';
import * as catalog from './ui/views/catalog.js';
import * as timeline from './ui/views/timeline.js';
import * as doomsday from './ui/views/doomsday.js';
import * as diary from './ui/views/diary.js';
import * as dataView from './ui/views/data.js';
import * as mapView from './ui/views/map.js';
import { emblem, setFavicon } from './ui/emblem.js';
import { playIntro } from './ui/intro.js';

const ROUTES = { painel: dashboard, catalogo: catalog, linha: timeline, mapa: mapView, doomsday, diario: diary, dados: dataView };

const adapter = createAdapter('mcuarchive:');
const profiles = new ProfileManager(adapter);
const store = new UserStore(adapter);
const external = new ExternalData(adapter);

const ctx = {
  store, profiles, external,
  ui: { filters: catalog.defaultFilters(), diary: diary.defaultDiary(), tlMode: 'release', tlOnlyMine: false, modal: null },
};
window.__mcu = ctx; // útil para depuração no console

const routeName = () => { const r = location.hash.replace(/^#\/?/, '').split('?')[0]; return ROUTES[r] ? r : 'painel'; };

function applyTheme() {
  const t = store.prefs.theme;
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('[data-action="theme"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === t)));
  setFavicon(t);
  $('meta[name="theme-color"]')?.setAttribute('content', t === 'doomsday' ? '#05080a' : '#120607');
}

function render({ keepScroll = true } = {}) {
  const name = routeName();
  const view = $('#view');
  const y = window.scrollY;
  try {
    view.innerHTML = ROUTES[name].render(ctx);
    ROUTES[name].mount?.(ctx, view);
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty"><h3>Falha ao carregar esta seção</h3><p>${esc(err.message)}</p><a class="btn ghost" href="#/painel">Voltar ao painel</a></div>`;
  }
  document.querySelectorAll('.nav a').forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === `#/${name}`));
  $('#profile-name').textContent = profiles.active.name;
  watchPosters();
  if (keepScroll) window.scrollTo(0, y);
}

store.subscribe(() => { applyTheme(); render(); renderModal(ctx); });

// ---------- ações ----------
function askText(title, value = '') {
  return new Promise((resolve) => {
    const dlg = $('#confirm');
    dlg.innerHTML = `<form method="dialog" class="confirm-box"><h2>${esc(title)}</h2>
      <input name="v" value="${esc(value)}" maxlength="40" required aria-label="${esc(title)}" autofocus>
      <div class="row end"><button value="no" formnovalidate class="btn ghost">Cancelar</button><button value="yes" class="btn primary">Salvar</button></div></form>`;
    dlg.onclose = () => resolve(dlg.returnValue === 'yes' ? dlg.querySelector('input').value.trim() : null);
    dlg.returnValue = '';
    dlg.showModal();
  });
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadPosters() {
  const list = catalog.filterWorks(ctx, ctx.ui.filters).filter((w) => !external.cached(w));
  if (!list.length) { toast('Pôsteres já carregados.'); return; }
  toast(`Buscando ${list.length} pôster(es)…`);
  let ok = 0;
  for (const w of list) {
    const r = await external.get(w);
    if (r.status === 'error') { toast(r.message || 'OMDb indisponível no momento.', 'warn'); break; }
    if (r.poster) ok++;
  }
  render();
  toast(`${ok} pôster(es) carregados.`, 'ok');
}

// ---------- pôsteres em segundo plano ----------
// Só busca as capas que aparecem na tela, no máximo 3 por vez, e cada obra
// gasta uma única consulta (o resultado fica em cache por 30 dias).
let posterObserver = null;
const posterQueue = [], posterQueued = new Set();
let posterActive = 0, posterWarned = false;

function applyPoster(id, url) {
  document.querySelectorAll(`.cover[data-work="${CSS.escape(id)}"]`).forEach((c) => {
    if (c.querySelector('img')) return;
    const img = new Image();
    img.alt = ''; img.decoding = 'async';
    img.onerror = () => img.remove();
    img.src = url;
    c.appendChild(img);
  });
}

function pumpPosters() {
  while (posterActive < 3 && posterQueue.length && !external.paused) {
    const w = posterQueue.shift();
    posterActive++;
    external.get(w).then((r) => {
      if (r.poster) applyPoster(w.id, r.poster);
      if (r.status === 'error' && r.message && !posterWarned) { posterWarned = true; toast(r.message, 'warn'); }
    }).finally(() => { posterActive--; posterQueued.delete(w.id); pumpPosters(); });
  }
}

function watchPosters() {
  posterObserver?.disconnect();
  if (!external.apiKey || external.paused || !('IntersectionObserver' in window)) return;
  posterObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const w = BY_ID[e.target.dataset.work];
      posterObserver.unobserve(e.target);
      if (!w || external.cached(w) || posterQueued.has(w.id)) continue;
      posterQueued.add(w.id); posterQueue.push(w);
    }
    pumpPosters();
  }, { rootMargin: '300px' });
  document.querySelectorAll('#view .cover[data-work]').forEach((c) => { if (!c.querySelector('img')) posterObserver.observe(c); });
}

/** Define a lista de navegação (anterior/próxima) conforme a tela de onde a obra foi aberta. */
const NAV_SCOPES = [
  ['.timeline', 'Linha do tempo'], ['#catalog-results', 'Catálogo'], ['.map', 'Mapa'],
  ['.doomsday-view', 'Doomsday Protocol'], ['#diary-results', 'Diário'],
];
function setNavContext(el) {
  const id = el.dataset.id;
  if (el.closest('#modal')) { // abrindo por uma conexão dentro do detalhe: mantém a lista se a obra estiver nela
    if (!ctx.ui.nav?.ids.includes(id)) ctx.ui.nav = null;
    return;
  }
  for (const [sel, label] of NAV_SCOPES) {
    const scope = el.closest(sel);
    if (!scope) continue;
    const ids = [...new Set([...scope.querySelectorAll('[data-action="open"][data-id]')].map((n) => n.dataset.id))].filter((x) => BY_ID[x]);
    ctx.ui.nav = ids.includes(id) ? { ids, label } : null;
    return;
  }
  if (el.closest('.dash')) {
    const ids = journeyWorks(store).map((w) => w.id);
    ctx.ui.nav = ids.includes(id) ? { ids, label: 'Minha jornada' } : null;
    return;
  }
  ctx.ui.nav = null;
}

const ACTIONS = {
  open: (el) => { setNavContext(el); openModal(ctx, { kind: 'detail', id: el.dataset.id }); },
  nav: (el) => openModal(ctx, { kind: 'detail', id: el.dataset.id }),
  'close-modal': () => closeModal(ctx),
  'back-detail': (el) => openModal(ctx, { kind: 'detail', id: el.dataset.id }),
  select: (el) => { const id = el.dataset.id; store.toggleSelected(id); toast(store.item(id).selected ? 'Adicionada à sua lista.' : 'Removida da sua lista.'); },
  fav: (el) => store.toggleFavorite(el.dataset.id),
  before: (el) => store.toggleWatchedBefore(el.dataset.id),
  rewatch: (el) => { store.startRewatch(el.dataset.id); toast('Reassistida em andamento.'); },
  log: (el) => openModal(ctx, { kind: 'form', id: el.dataset.id }),
  'edit-review': (el) => openModal(ctx, { kind: 'form', id: el.dataset.id, mode: 'edit' }),
  status: (el) => {
    const { id, value } = el.dataset;
    if (isUpcoming(BY_ID[id]) && value !== 'unwatched') { toast('Esta obra ainda não foi lançada.', 'warn'); return; }
    if (value === 'watched') { openModal(ctx, { kind: 'form', id }); return; }
    store.setStatus(id, value);
  },
  'del-hist': async (el) => {
    const ok = await confirmDialog({ title: 'Remover registro?', body: 'Esta visualização será apagada do histórico.', confirmLabel: 'Remover', danger: true });
    if (ok) store.removeHistory(el.dataset.id, el.dataset.entry);
  },
  theme: (el) => store.setPref('theme', el.dataset.value),
  journey: (el) => { store.setPref('journey', el.dataset.value); toast(el.dataset.value === 'doomsday' ? 'Jornada Doomsday Protocol ativada.' : 'Jornada completa ativada.'); },
  order: (el) => store.setPref('order', el.dataset.value),
  'dd-tier': (el) => {
    const t = el.dataset.value; const cur = new Set(store.prefs.doomsdayTiers);
    el.checked ? cur.add(t) : cur.delete(t);
    store.setPref('doomsdayTiers', [...cur]);
  },
  'dd-to-list': () => { const ids = WORKS.filter((w) => w.target || store.prefs.doomsdayTiers.includes(w.tier)).map((w) => w.id); store.setSelection(ids, true); toast(`${ids.length} obras adicionadas à sua lista.`, 'ok'); },
  preset: async (el) => {
    const v = el.dataset.value;
    if (v === 'clear') {
      if (await confirmDialog({ title: 'Limpar seleção?', body: 'Todas as obras saem da sua lista. Status, notas e histórico são mantidos.', confirmLabel: 'Limpar', danger: true })) store.clearSelection();
      return;
    }
    store.setSelection(PRESETS[v].ids, true);
    if (store.prefs.journey !== 'full') store.setPref('journey', 'full');
    toast(`${PRESETS[v].label}: ${PRESETS[v].ids.length} obras na sua lista.`, 'ok');
  },
  'select-visible': () => { const ids = catalog.filterWorks(ctx, ctx.ui.filters).map((w) => w.id); store.setSelection(ids, true); toast(`${ids.length} obras adicionadas.`, 'ok'); },
  'clear-filters': () => { ctx.ui.filters = catalog.defaultFilters(); render(); },
  'tl-mode': (el) => { ctx.ui.tlMode = el.dataset.value; render(); },
  'tl-mine': (el) => { ctx.ui.tlOnlyMine = el.checked; render(); },
  'load-posters': loadPosters,
  export: () => {
    const name = profiles.active.name.replace(/[^\w-]+/g, '_');
    download(`mcu-archive-${name}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(store.exportData(profiles.active.name), null, 2));
    toast('Backup exportado.', 'ok');
  },
  reset: async () => {
    if (await confirmDialog({ title: 'Apagar dados pessoais?', body: `Todos os registros do perfil "${profiles.active.name}" serão apagados. Esta ação não pode ser desfeita, a menos que você tenha um backup.`, confirmLabel: 'Apagar tudo', danger: true })) { store.reset(); toast('Jornada reiniciada.', 'ok'); }
  },
  'profile-new': async () => { const name = await askText('Nome do novo perfil'); if (name) { const p = profiles.create(name); store.load(p.id); toast(`Perfil "${p.name}" criado.`, 'ok'); } },
  'profile-rename': async () => { const name = await askText('Renomear perfil', profiles.active.name); if (name) { profiles.rename(profiles.activeId, name); render(); } },
  'profile-delete': async () => {
    const p = profiles.active;
    if (await confirmDialog({ title: `Excluir o perfil "${p.name}"?`, body: 'O perfil e todos os registros dele serão apagados deste navegador.', confirmLabel: 'Excluir', danger: true })) {
      profiles.remove(p.id); store.load(profiles.activeId); toast('Perfil excluído.');
    }
  },
  'replay-intro': () => playIntro({ agent: profiles.active.name, theme: store.prefs.theme, force: true }),
  'clear-cache': () => { external.clearCache(); render(); toast('Cache limpo.'); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type === 'file')) return;
  if (el.tagName === 'INPUT' && el.type === 'checkbox') return; // tratado em "change"
  const fn = ACTIONS[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.matches('input[type="checkbox"][data-action]')) { ACTIONS[el.dataset.action]?.(el); return; }
  if (el.matches('select[data-action="profile-switch"]')) { profiles.switchTo(el.value); store.load(el.value); toast(`Perfil "${profiles.active.name}" ativo.`); return; }
  if (el.matches('input[type="file"][data-action="import"]')) {
    const file = el.files?.[0]; el.value = '';
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Arquivo grande demais (limite de 5 MB).');
      const obj = JSON.parse(await file.text());
      validateBackup(obj);
      if (!(await confirmDialog({ title: 'Importar backup?', body: `Os registros atuais do perfil "${profiles.active.name}" serão substituídos.`, confirmLabel: 'Importar' }))) return;
      const n = store.importData(obj);
      toast(`Backup importado: ${n} obra(s) com registros.`, 'ok');
    } catch (err) { toast(err instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : err.message, 'warn'); }
    return;
  }
  const form = el.closest('form[data-form]');
  if (form?.dataset.form === 'filters') catalog.onFilter(ctx, form);
  if (form?.dataset.form === 'diary') diary.onFilter(ctx, form);
});

let qTimer;
document.addEventListener('input', (e) => {
  const form = e.target.closest('form[data-form="filters"]');
  if (form && e.target.name === 'q') { clearTimeout(qTimer); qTimer = setTimeout(() => catalog.onFilter(ctx, form), 150); }
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  const kind = form.dataset.form;
  if (kind === 'filters' || kind === 'diary') { e.preventDefault(); return; }
  e.preventDefault();
  const fd = new FormData(form);
  if (kind === 'omdb') { external.setApiKey(fd.get('key')); external.clearCache(); render(); toast(external.apiKey ? 'Chave salva neste navegador.' : 'Chave removida.', 'ok'); return; }
  const id = form.dataset.id;
  const payload = { rating: fd.has('norating') ? null : fd.get('rating'), review: String(fd.get('review') || '').trim(), notes: String(fd.get('notes') || '').trim() };
  if (kind === 'complete') {
    store.complete(id, { ...payload, date: fd.get('date'), kind: fd.get('kind') });
    toast('Visualização registrada.', 'ok');
  } else store.editReview(id, payload);
  openModal(ctx, { kind: 'detail', id });
});

$('#modal').addEventListener('close', () => { ctx.ui.modal = null; ctx.ui.nav = null; ctx.ui.lastModalId = null; });

// Setas ← → navegam entre as obras com o detalhe aberto (exceto ao digitar em campos).
document.addEventListener('keydown', (e) => {
  const st = ctx.ui.modal;
  if (!st || st.kind !== 'detail' || !ctx.ui.nav || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
  const idx = ctx.ui.nav.ids.indexOf(st.id);
  const target = ctx.ui.nav.ids[idx + (e.key === 'ArrowRight' ? 1 : -1)];
  if (target) { e.preventDefault(); openModal(ctx, { kind: 'detail', id: target }); }
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(ctx); });

window.addEventListener('hashchange', () => { closeModal(ctx); render({ keepScroll: false }); $('#view').focus({ preventScroll: true }); });

// ---------- início ----------
$('.brand-mark').innerHTML = emblem({ size: 34 });
store.load(profiles.activeId);
playIntro({ agent: profiles.active.name, theme: store.prefs.theme });
if (!location.hash) history.replaceState(null, '', '#/painel');
render({ keepScroll: false });
