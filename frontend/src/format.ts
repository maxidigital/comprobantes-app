export const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatFecha(fecha: string): string {
  const date = new Date(fecha);
  return Number.isNaN(date.getTime()) ? fecha : dateFormatter.format(date);
}
