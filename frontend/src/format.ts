export const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const currencySiempreConCentavos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Separa el monto formateado en la parte principal y ", XX" de centavos (siempre 2 decimales, incluso $0), para poder mostrar los centavos en un tamaño menor. */
export function formatMontoPartes(monto: number): { principal: string; centavos: string } {
  let principal = '';
  let centavos = '';
  let enDecimales = false;

  for (const part of currencySiempreConCentavos.formatToParts(monto)) {
    if (part.type === 'decimal') {
      enDecimales = true;
    }
    if (enDecimales) {
      centavos += part.value;
    } else {
      principal += part.value;
    }
  }

  return { principal, centavos };
}

const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatFecha(fecha: string): string {
  const date = new Date(fecha);
  return Number.isNaN(date.getTime()) ? fecha : dateFormatter.format(date);
}
