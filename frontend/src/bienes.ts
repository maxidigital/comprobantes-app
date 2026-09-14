export const BIENES = ['General', 'Iriondo', 'San Martín', 'Oficina', '3 de febrero'];

/**
 * Un color fijo por bien, tomado de la paleta ya definida en index.css (no
 * se agregan colores nuevos) — deja afuera --status-pending a propósito,
 * ya usado para el glow de "comprobante pendiente"; reusarlo acá haría que
 * un bien se confunda con ese estado.
 */
const COLOR_VAR_BY_BIEN: Record<string, string> = {
  General: '--brand-primary',
  Iriondo: '--income',
  'San Martín': '--expense',
  Oficina: '--brand-accent',
  '3 de febrero': '--danger',
};

export function bienColor(bien: string): string {
  return `var(${COLOR_VAR_BY_BIEN[bien] ?? '--brand-primary'})`;
}
