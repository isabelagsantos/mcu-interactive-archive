import { CATALOG_VERSION } from '../../catalog/catalog.js';
import { esc } from '../dom.js';

export function render(ctx) {
  const { profiles, store, external } = ctx;
  const n = Object.keys(store.data.items).length;
  const persistent = store.json.adapter.persistent;
  return `<section class="view"><header class="view-head"><p class="eyebrow">ARQUIVO PESSOAL</p><h1>Dados e perfis</h1>
    <p class="muted">Seus dados ficam só neste navegador. Ninguém mais tem acesso a eles, nem o autor do site. Para levar a jornada a outro aparelho, exporte um backup e importe lá.</p>
    ${persistent ? '' : '<div class="notice warn" role="alert">O armazenamento local está bloqueado neste navegador (modo privado ou cookies desativados). Os dados serão perdidos ao fechar a página: exporte um backup.</div>'}
    ${store.lastError ? `<div class="notice warn" role="alert">${esc(store.lastError)}</div>` : ''}</header>
    <div class="grid two">
      <div class="panel"><h3>Perfil local</h3>
        <p class="muted tiny">Perfis permitem que mais de uma pessoa use este navegador sem misturar os dados.</p>
        <label class="field"><span>Perfil ativo</span><select data-action="profile-switch">${profiles.list.map((p) => `<option value="${esc(p.id)}" ${p.id === profiles.activeId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        <div class="row wrap gap-s"><button class="btn ghost small" data-action="profile-new">+ Novo perfil</button>
          <button class="btn ghost small" data-action="profile-rename">Renomear</button>
          <button class="btn ghost small danger-text" data-action="profile-delete" ${profiles.list.length < 2 ? 'disabled' : ''}>Excluir perfil</button></div></div>
      <div class="panel"><h3>Backup</h3><p class="muted tiny">${n} obra(s) com registros · última alteração ${store.data.updatedAt ? esc(new Date(store.data.updatedAt).toLocaleString('pt-BR')) : '—'}</p>
        <div class="row wrap gap-s"><button class="btn primary" data-action="export">Exportar JSON</button>
          <label class="btn ghost file-btn">Importar JSON<input type="file" accept="application/json,.json" data-action="import" hidden></label></div>
        <p class="tiny muted">Importar substitui os registros do perfil ativo.</p></div>
      <div class="panel"><h3>Reiniciar jornada</h3><p class="muted tiny">Apaga a seleção, os status, as notas e o histórico deste perfil. O tema é mantido. Os outros perfis não são afetados.</p>
        <button class="btn danger" data-action="reset">Limpar dados pessoais</button></div>
      <div class="panel"><h3>Pôsteres e avaliações (opcional)</h3>
        <p class="muted tiny">O app usa a <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener">OMDb API</a> para mostrar pôsteres e notas do IMDb, Rotten Tomatoes e Metacritic. A chave gratuita fica salva só neste navegador. Sem ela, o app funciona normalmente, mas sem essas informações.</p>
        <form class="row gap-s" data-form="omdb"><input type="password" name="key" value="${esc(external.apiKey)}" placeholder="Chave OMDb" autocomplete="off" aria-label="Chave da OMDb">
          <button class="btn ghost small" type="submit">Salvar</button></form>
        <button class="btn ghost small" data-action="clear-cache">Limpar cache de pôsteres</button></div>
    </div>
    <p class="tiny muted center">Catálogo versão ${esc(CATALOG_VERSION)} · atualizações no catálogo não apagam seus registros.</p></section>`;
}
