/**
 * Símbolo oficial do MCU Interactive Archive: disco vermelho, anel dourado e
 * estrela branca. Arte própria do projeto. As cores são fixas, então o símbolo
 * é idêntico em qualquer tema, no favicon e na abertura.
 */
export const BRAND = { red: '#b3121b', gold: '#e8c26a', white: '#ffffff' };
const STAR = 'M32 14l5 13h13l-10 8 4 14-12-9-12 9 4-14-10-8h13z';

export function emblem({ size = 32, cls = '' } = {}) {
  return `<svg class="emblem ${cls}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <circle class="em-disc" cx="32" cy="32" r="30" fill="${BRAND.red}"/>
  <circle class="em-ring" cx="32" cy="32" r="20" fill="none" stroke="${BRAND.gold}" stroke-width="4"/>
  <path class="em-star" d="${STAR}" fill="${BRAND.white}"/>
</svg>`;
}

/** Caminho da estrela, reaproveitado pelas capas (viewBox 64). */
export const STAR_PATH = STAR;

/** Favicon: o mesmo símbolo, igual em todos os temas. */
export function setFavicon() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='30' fill='${BRAND.red}'/><circle cx='32' cy='32' r='20' fill='none' stroke='${BRAND.gold}' stroke-width='4'/><path d='${STAR}' fill='${BRAND.white}'/></svg>`;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Carimbo estilo arquivo classificado. */
export const stamp = (text, kind = '') => `<span class="stamp ${kind}" aria-hidden="true">${text}</span>`;
