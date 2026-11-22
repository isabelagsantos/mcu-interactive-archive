/** Modal de detalhes da obra e formulários de registro. */
import { BY_ID, TIERS } from '../catalog/catalog.js';
import { STATUS, VIEW_KIND } from '../core/userStore.js';
import { isUpcoming } from '../core/selectors.js';
import { localISO } from '../core/dates.js';
import { esc, $, fmtDate, duration, typeLabel, sagaLabel, missionId, statusBadge, cover } from './dom.js';

let lastFocus = null;

export function openModal(ctx, state) {
  const dlg = $('#modal');
  ctx.ui.modal = state;
  if (!dlg.open) { lastFocus = document.activeElement; dlg.showModal(); }
  renderModal(ctx);
}

export function closeModal(ctx) {
  const dlg = $('#modal');
  ctx.ui.modal = null; ctx.ui.nav = null; ctx.ui.lastModalId = null;
  if (dlg.open) dlg.close();
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
}

export function renderModal(ctx) {
  const st = ctx.ui.modal;
  const dlg = $('#modal');
  if (!st || !dlg.open) return;
  const w = BY_ID[st.id];
  if (!w) { closeModal(ctx); return; }
  const changed = ctx.ui.lastModalId !== `${st.kind}:${st.id}`;
  ctx.ui.lastModalId = `${st.kind}:${st.id}`;
  dlg.innerHTML = st.kind === 'form' ? formHTML(ctx, w, st) : detailHTML(ctx, w);
  if (changed) dlg.scrollTop = 0;
  if (st.kind === 'detail') loadExternal(ctx, w);
  const focusEl = dlg.querySelector('[autofocus]') || dlg.querySelector('.modal-close');
  focusEl?.focus({ preventScroll: true });
}

function ratingsBlock(ext) {
  if (!ext) return '<p class="muted">Carregando avaliações…</p>';
  if (ext.status === 'nokey') return '<p class="muted">Avaliações externas indisponíveis. Para exibir notas do IMDb, Rotten Tomatoes e Metacritic, informe uma chave gratuita da OMDb em <a href="#/dados">Dados</a>.</p>';
  if (ext.status === 'error') return `<p class="muted">Avaliações indisponíveis no momento${ext.message ? ` (${esc(ext.message)})` : ''}.</p>`;
  if (ext.status === 'notfound' || !ext.ratings?.length) return '<p class="muted">Nenhuma avaliação externa disponível para esta obra.</p>';
  const row = (r) => `<li><span class="r-val">${esc(r.value)}</span><span class="r-src">${esc(r.source)}${r.votes ? ` · ${esc(r.votes)} votos` : ''}</span></li>`;
  const pub = ext.ratings.filter((r) => r.kind === 'publico'), crit = ext.ratings.filter((r) => r.kind === 'critica');
  return `<div class="ratings"><div><h4>Público</h4><ul>${pub.length ? pub.map(row).join('') : '<li class="muted">Indisponível</li>'}</ul></div>
    <div><h4>Crítica</h4><ul>${crit.length ? crit.map(row).join('') : '<li class="muted">Indisponível</li>'}</ul></div></div>
    ${ext.seriesLevel ? '<p class="tiny muted">Em séries, a nota se refere à série inteira, não a uma temporada.</p>' : ''}`;
}

async function loadExternal(ctx, w) {
  const res = await ctx.external.get(w);
  const st = ctx.ui.modal;
  if (!st || st.id !== w.id || st.kind !== 'detail') return;
  const box = $('#ext-ratings');
  if (box) box.innerHTML = ratingsBlock(res);
  if (res.poster) {
    const c = $('#modal .detail-cover');
    if (c && !c.querySelector('img')) c.innerHTML = cover(w, res.poster);
  }
}

/** Barra superior fixa: anterior / posição / próxima / fechar. Segue a ordem da tela de origem. */
function navBar(ctx, w) {
  const nav = ctx.ui.nav;
  const idx = nav ? nav.ids.indexOf(w.id) : -1;
  const close = '<button class="modal-close icon-btn" data-action="close-modal" aria-label="Fechar">✕</button>';
  if (idx < 0) return `<div class="modal-bar"><span class="spacer"></span>${close}</div>`;
  const prev = BY_ID[nav.ids[idx - 1]], next = BY_ID[nav.ids[idx + 1]];
  const btn = (target, dir) => {
    const label = dir === 'prev' ? 'Anterior' : 'Próxima';
    if (!target) return `<button class="nav-btn ${dir}" disabled aria-label="${label}: não há">${dir === 'prev' ? '◂' : ''}<span class="nav-text"><small>${label}</small></span>${dir === 'next' ? '▸' : ''}</button>`;
    return `<button class="nav-btn ${dir}" data-action="nav" data-id="${target.id}" aria-label="${label}: ${esc(target.t)}" title="${esc(target.t)} (tecla ${dir === 'prev' ? '←' : '→'})">${dir === 'prev' ? '◂' : ''}<span class="nav-text"><small>${label}</small><b>${esc(target.t)}</b></span>${dir === 'next' ? '▸' : ''}</button>`;
  };
  return `<div class="modal-bar">${btn(prev, 'prev')}<span class="nav-pos" aria-live="polite">${esc(nav.label)} · ${idx + 1}/${nav.ids.length}</span>${btn(next, 'next')}${close}</div>`;
}

function detailHTML(ctx, w) {
  const it = ctx.store.item(w.id);
  const upcoming = isUpcoming(w);
  const cached = ctx.external.cached(w);
  const links = w.links.map((id) => BY_ID[id]).filter(Boolean);
  const backlinks = Object.values(BY_ID).filter((x) => x.links.includes(w.id) && !w.links.includes(x.id));
  const chip = (x) => `<button class="chip link" data-action="open" data-id="${x.id}">${esc(x.t)}</button>`;
  const hist = it.history.length
    ? `<ol class="history">${it.history.map((h) => `<li><span class="h-kind k-${h.kind}">${esc(VIEW_KIND[h.kind])}</span>
        <span>${esc(fmtDate(h.date))}</span>${h.rating != null ? `<span class="h-rate">${h.rating}/10</span>` : ''}
        <button class="icon-btn" data-action="del-hist" data-id="${w.id}" data-entry="${h.id}" aria-label="Remover registro de ${esc(fmtDate(h.date))}">✕</button></li>`).join('')}</ol>`
    : '<p class="muted">Nenhuma visualização registrada.</p>';

  return `<article class="detail" aria-labelledby="dt-title">
    ${navBar(ctx, w)}
    ${it.status === 'watched' ? '<span class="stamp stamp-big stamp-done">ARQUIVO CONCLUÍDO</span>' : w.target ? '<span class="stamp stamp-big stamp-alert">ALERTA DE INCURSÃO</span>' : '<span class="stamp stamp-big">CLASSIFICADO</span>'}
    <div class="detail-head">
      <div class="detail-cover">${cover(w, cached?.poster)}</div>
      <div class="detail-meta">
        <p class="eyebrow">ARQUIVO ${esc(missionId(w))} · ${esc(sagaLabel(w.saga))}</p>
        <h2 id="dt-title">${esc(w.t)}</h2>
        ${w.o && w.o !== w.t ? `<p class="original">${esc(w.o)}</p>` : ''}
        <div class="row wrap gap-s">${statusBadge(it, w)}
          ${w.tier ? `<span class="badge tier-${w.tier}" title="Curadoria Doomsday Protocol">${esc(TIERS[w.tier].label)}</span>` : ''}
          ${w.alt ? '<span class="badge badge-alt">Universo alternativo</span>' : ''}
          ${it.favorite ? '<span class="badge badge-fav">★ Favorita</span>' : ''}</div>
        <dl class="facts">
          <div><dt>Tipo</dt><dd>${esc(typeLabel(w))}</dd></div>
          <div><dt>Lançamento</dt><dd>${esc(fmtDate(w.date))}</dd></div>
          <div><dt>Fase</dt><dd>Fase ${w.phase}</dd></div>
          <div><dt>Duração</dt><dd>${esc(duration(w))}</dd></div>
          <div><dt>Cronologia</dt><dd>${w.chrono ? `nº ${w.chrono} na linha do tempo` : 'Fora da linha principal'}</dd></div>
        </dl>
      </div>
    </div>

    <section class="panel actions-panel" aria-label="Minha jornada">
      <h3>Minha jornada</h3>
      <div class="row wrap gap-s">
        <button class="btn ${it.selected ? 'primary' : 'ghost'}" data-action="select" data-id="${w.id}" aria-pressed="${it.selected}">${it.selected ? '✓ Na minha lista' : '+ Adicionar à lista'}</button>
        <button class="btn ghost" data-action="fav" data-id="${w.id}" aria-pressed="${it.favorite}">${it.favorite ? '★ Favorita' : '☆ Favoritar'}</button>
      </div>
      <div class="seg" role="group" aria-label="Status">
        ${['unwatched', 'progress', 'watched'].map((s) => `<button class="${it.status === s ? 'on' : ''}" data-action="status" data-id="${w.id}" data-value="${s}" aria-pressed="${it.status === s}" ${upcoming && s !== 'unwatched' ? 'disabled title="Ainda não lançada"' : ''}>${STATUS[s]}</button>`).join('')}
      </div>
      <div class="row wrap gap-s">
        <button class="btn ghost small" data-action="before" data-id="${w.id}" aria-pressed="${it.watchedBefore}">${it.watchedBefore ? '✓ Já tinha assistido antes' : 'Já assisti anteriormente'}</button>
        <button class="btn ghost small" data-action="rewatch" data-id="${w.id}" ${upcoming || !(it.status === 'watched' || it.watchedBefore) ? 'disabled' : ''}>↻ Reassistir</button>
        <button class="btn ghost small" data-action="log" data-id="${w.id}" ${upcoming ? 'disabled' : ''}>+ Registrar visualização</button>
      </div>
      ${it.status === 'progress' ? `<p class="tiny muted">Visualização atual: <strong>${it.mode === 'rewatch' ? 'reassistida' : 'primeira vez'}</strong>.</p>` : ''}
    </section>

    <section class="panel"><h3>Sinopse</h3><p>${esc(w.syn)}</p>
      <h3>Importância para o MCU</h3><p>${esc(w.imp)}</p>
      ${w.chars.length ? `<h3>Principais personagens</h3><p class="chars">${w.chars.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</p>` : ''}
      ${links.length || backlinks.length ? `<h3>Conexões narrativas</h3><div class="chips">${links.map(chip).join('')}${backlinks.map(chip).join('')}</div>` : ''}
    </section>

    <section class="panel"><h3>Avaliações externas</h3><div id="ext-ratings">${ratingsBlock(cached || (ctx.external.apiKey ? null : { status: 'nokey' }))}</div></section>

    <section class="panel"><div class="row between"><h3>Meu registro</h3>
      <button class="btn ghost small" data-action="edit-review" data-id="${w.id}">Editar nota e resenha</button></div>
      <div class="my-rating"><span class="big">${it.rating != null ? it.rating : '—'}</span><span class="muted">/10 · minha nota</span></div>
      ${it.review ? `<blockquote class="review">${esc(it.review)}</blockquote>` : '<p class="muted">Sem resenha ainda.</p>'}
      ${it.notes ? `<p class="notes"><strong>Observações:</strong> ${esc(it.notes)}</p>` : ''}
      <h4>Histórico de visualizações</h4>${hist}
    </section>
  </article>`;
}

function formHTML(ctx, w, st) {
  const it = ctx.store.item(w.id);
  const edit = st.mode === 'edit';
  const kind = st.viewKind || (it.mode === 'rewatch' || it.status === 'watched' ? 'rewatch' : 'first');
  const today = localISO();
  return `<form class="detail form" data-form="${edit ? 'edit' : 'complete'}" data-id="${w.id}" aria-labelledby="fm-title">
    <button type="button" class="modal-close icon-btn" data-action="back-detail" data-id="${w.id}" aria-label="Voltar">✕</button>
    <p class="eyebrow">RELATÓRIO DE MISSÃO · ${esc(missionId(w))}</p>
    <h2 id="fm-title">${edit ? 'Editar registro' : 'Registrar visualização'}: ${esc(w.t)}</h2>
    ${edit ? '' : `<fieldset class="kinds"><legend>Tipo de visualização</legend>
      ${Object.entries(VIEW_KIND).map(([k, l]) => `<label><input type="radio" name="kind" value="${k}" ${k === kind ? 'checked' : ''}> ${esc(l)}</label>`).join('')}
    </fieldset>
    <label class="field"><span>Data</span><input type="date" name="date" value="${today}" max="${today}"></label>`}
    <label class="field"><span>Minha nota (0 a 10) <output id="rate-out">${it.rating ?? '—'}</output></span>
      <input type="range" name="rating" min="0" max="10" step="0.5" value="${it.rating ?? 7}" oninput="document.getElementById('rate-out').value=this.value" ${edit ? '' : 'data-touched="0"'}>
      <label class="tiny"><input type="checkbox" name="norating" ${it.rating == null && edit ? 'checked' : ''}> Sem nota</label></label>
    <label class="field"><span>Resenha</span><textarea name="review" rows="4" maxlength="5000" placeholder="O que achou?" autofocus>${esc(edit ? it.review : '')}</textarea></label>
    <label class="field"><span>Observações</span><textarea name="notes" rows="2" maxlength="5000" placeholder="Cenas pós-créditos, teorias, onde assistiu…">${esc(edit ? it.notes : '')}</textarea></label>
    <p class="tiny muted">Sua nota é pessoal e independente das avaliações externas.</p>
    <div class="row end gap-s"><button type="button" class="btn ghost" data-action="back-detail" data-id="${w.id}">Cancelar</button>
      <button type="submit" class="btn primary">Salvar registro</button></div>
  </form>`;
}
