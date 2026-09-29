import type { Moneda } from './format';
import type { TipoMovimiento } from './types';

interface Props {
  /** Cualquier lista con tipo + monto: movimientos de la sucesión o de una de las cajas de ADMIN. */
  movimientos: { tipo: TipoMovimiento; monto: number }[];
  moneda?: Moneda;
  etiquetas?: { ingresos: string; gastos: string; balance: string };
}

const ETIQUETAS_DEFAULT = { ingresos: 'Ingresos', gastos: 'Egresos', balance: 'Balance' };

export default function Totals({ movimientos, moneda = 'ARS', etiquetas = ETIQUETAS_DEFAULT }: Props) {
  const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, maximumFractionDigits: 0 });
  const totalIngresos = movimientos.filter((m) => m.tipo === 'INGRESO').reduce((sum, m) => sum + m.monto, 0);
  const totalGastos = movimientos.filter((m) => m.tipo === 'GASTO').reduce((sum, m) => sum + m.monto, 0);
  const balance = totalIngresos - totalGastos;

  return (
    <div className="totals">
      <div className="card stat ingreso">
        <div className="label">{etiquetas.ingresos}</div>
        <div className="value">{currency.format(totalIngresos)}</div>
      </div>
      <div className="card stat gasto">
        <div className="label">{etiquetas.gastos}</div>
        <div className="value">{currency.format(totalGastos)}</div>
      </div>
      <div className="card stat balance">
        <div className="label">{etiquetas.balance}</div>
        <div className={`value ${balance < 0 ? 'negative' : ''}`}>{currency.format(balance)}</div>
      </div>
    </div>
  );
}
