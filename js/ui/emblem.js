/**
 * Emblema original do MCU Interactive Archive (arte própria do projeto,
 * sem relação com marcas oficiais): anel de monitoramento, três órbitas
 * de linhas do tempo e um núcleo em losango.
 */
export function emblem({ size = 32, cls = '', anim = false } = {}) {
  return `<svg class="emblem ${cls} ${anim ? 'emblem-anim' : ''}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
  <defs><linearGradient id="em-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
  <circle class="em-ring" cx="50" cy="50" r="46" fill="none" stroke="url(#em-g)" stroke-width="4"/>
  <circle class="em-ticks" cx="50" cy="50" r="39" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="2 6.17" opacity=".8"/>
  <g class="em-orbits" fill="none" stroke="var(--accent-2)" stroke-width="2.2" opacity=".9">
    <ellipse cx="50" cy="50" rx="30" ry="11"/>
    <ellipse cx="50" cy="50" rx="30" ry="11" transform="rotate(60 50 50)"/>
    <ellipse cx="50" cy="50" rx="30" ry="11" transform="rotate(120 50 50)"/>
  </g>
  <path class="em-core" d="M50 34 L62 50 L50 66 L38 50 Z" fill="url(#em-g)"/>
  <circle cx="50" cy="50" r="4" fill="var(--bg)"/>
</svg>`;
}

/** Favicon do emblema (cores fixas, já que o favicon não lê variáveis CSS). */
export function setFavicon(theme) {
  const [a, b, bg] = theme === 'doomsday' ? ['#36f5b4', '#ffb020', '#030607'] : ['#e23636', '#e8c26a', '#0d0507'];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='${bg}'/><circle cx='50' cy='50' r='44' fill='none' stroke='${a}' stroke-width='6'/><g fill='none' stroke='${b}' stroke-width='4'><ellipse cx='50' cy='50' rx='30' ry='11'/><ellipse cx='50' cy='50' rx='30' ry='11' transform='rotate(60 50 50)'/><ellipse cx='50' cy='50' rx='30' ry='11' transform='rotate(120 50 50)'/></g><path d='M50 34 L62 50 L50 66 L38 50 Z' fill='${a}'/></svg>`;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Carimbo estilo arquivo classificado. */
export const stamp = (text, kind = '') => `<span class="stamp ${kind}" aria-hidden="true">${text}</span>`;
