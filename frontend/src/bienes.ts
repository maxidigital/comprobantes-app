export const BIENES = ['General', 'Iriondo', 'San Martín', 'Oficina', '3 de febrero'];

/**
 * Un color fijo por bien — deja afuera --income (ya es "ingreso" en los
 * bordes/montos), --status-pending (ya es "comprobante pendiente") y
 * --gasto (ya es "egreso"): reusar cualquiera de esos acá haría que un
 * bien se lea como si fuera ese estado.
 */
const COLOR_VAR_BY_BIEN: Record<string, string> = {
  General: '--brand-primary',
  Iriondo: '--teal',
  'San Martín': '--expense',
  Oficina: '--brand-accent',
  '3 de febrero': '--danger',
};

export function bienColor(bien: string): string {
  return `var(${COLOR_VAR_BY_BIEN[bien] ?? '--brand-primary'})`;
}
