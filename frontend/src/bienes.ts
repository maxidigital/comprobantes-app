export const BIENES = ['General', 'Iriondo', 'San Martín', 'Oficina', '3 de febrero'];

/**
 * Un color fijo por bien, tomado de la paleta ya definida en index.css (no
 * se agregan colores nuevos, aunque --bien-alt sí es una mezcla derivada de
 * dos tokens existentes — ver ahí el porqué) — deja afuera --income (ya es
 * "ingreso" en los bordes/montos) y --status-pending (ya es "comprobante
 * pendiente"): reusar cualquiera de los dos acá haría que un bien se lea
 * como si fuera ese estado.
 */
const COLOR_VAR_BY_BIEN: Record<string, string> = {
  General: '--brand-primary',
  Iriondo: '--bien-alt',
  'San Martín': '--expense',
  Oficina: '--brand-accent',
  '3 de febrero': '--danger',
};

export function bienColor(bien: string): string {
  return `var(${COLOR_VAR_BY_BIEN[bien] ?? '--brand-primary'})`;
}
