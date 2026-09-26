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
  // "yyyy-MM-dd" a secas lo parsea el motor de JS como medianoche UTC, no
  // local — en un huso horario detrás de UTC (Argentina) el día mostrado
  // termina siendo el anterior. Se le agrega la hora local explícita, mismo
  // truco que ya usa MovimientoForm para el datepicker.
  const esIsoSinHora = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  const date = new Date(esIsoSinHora ? `${fecha}T00:00:00` : fecha);
  return Number.isNaN(date.getTime()) ? fecha : dateFormatter.format(date);
}
