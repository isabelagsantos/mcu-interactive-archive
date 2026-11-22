/**
 * Datas no fuso horário local do usuário.
 * Nunca use `new Date().toISOString().slice(0, 10)` para "hoje": ele devolve a
 * data em UTC, que no Brasil já é o dia seguinte depois das 21h.
 */
export function localISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
