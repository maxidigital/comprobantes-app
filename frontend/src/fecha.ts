export function todayDisplay(): string {
  return dateToDisplay(new Date());
}

export function dateToDisplay(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** yyyy-MM-dd (como llega de la API) -> dd/mm/yyyy, para precargar un form al editar. */
export function isoToDisplay(iso: string): string {
  const [yyyy, mm, dd] = iso.split('-');
  return yyyy && mm && dd ? `${dd}/${mm}/${yyyy}` : todayDisplay();
}

/** Inserta las "/" a medida que se tipean dígitos: 12092026 -> 12/09/2026 */
export function formatFechaInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/** dd/mm/yyyy -> yyyy-MM-dd (lo que espera la API), o null si está incompleta/inválida. */
export function fechaToIso(texto: string): string | null {
  const match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const dia = Number(dd);
  const mes = Number(mm);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Date -> yyyy-MM-dd usando los componentes locales (nunca toISOString,
 * que trunca a UTC y puede correr la fecha un día según el huso horario). */
export function dateToIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function rangoEsteMes(): [string, string] {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return [dateToIso(desde), dateToIso(hasta)];
}

export function rangoMesPasado(): [string, string] {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  return [dateToIso(desde), dateToIso(hasta)];
}

export function rangoEsteAnio(): [string, string] {
  return rangoAnio(new Date().getFullYear());
}

export function rangoAnio(anio: number): [string, string] {
  return [dateToIso(new Date(anio, 0, 1)), dateToIso(new Date(anio, 11, 31))];
}

/** mes: 1-12 */
export function rangoMes(anio: number, mes: number): [string, string] {
  return [dateToIso(new Date(anio, mes - 1, 1)), dateToIso(new Date(anio, mes, 0))];
}
