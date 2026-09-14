import type { Movimiento } from './types';

interface Props {
  movimientos: Movimiento[];
}

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export default function Totals({ movimientos }: Props) {
  const totalIngresos = movimientos.filter((m) => m.tipo === 'INGRESO').reduce((sum, m) => sum + m.monto, 0);
  const totalGastos = movimientos.filter((m) => m.tipo === 'GASTO').reduce((sum, m) => sum + m.monto, 0);
  const balance = totalIngresos - totalGastos;

  return (
    <div className="totals">
      <div className="card stat ingreso">
        <div className="label">Ingresos</div>
        <div className="value">{currency.format(totalIngresos)}</div>
      </div>
      <div className="card stat gasto">
        <div className="label">Egresos</div>
        <div className="value">{currency.format(totalGastos)}</div>
      </div>
      <div className="card stat balance">
        <div className="label">Balance</div>
        <div className={`value ${balance < 0 ? 'negative' : ''}`}>{currency.format(balance)}</div>
      </div>
    </div>
  );
}
