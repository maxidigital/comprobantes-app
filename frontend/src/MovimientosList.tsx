import { useMemo, useState } from 'react';
import type { FiltroTipo, Movimiento } from './types';

interface Props {
  movimientos: Movimiento[];
  isAdmin: boolean;
  onRequestDelete: (movimiento: Movimiento) => void;
  onRequestAttach: (movimiento: Movimiento) => void;
}

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function formatFecha(fecha: string): string {
  const date = new Date(fecha);
  return Number.isNaN(date.getTime()) ? fecha : dateFormatter.format(date);
}

export default function MovimientosList({ movimientos, isAdmin, onRequestDelete, onRequestAttach }: Props) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [soloPendientes, setSoloPendientes] = useState(false);

  const visibles = useMemo(() => {
    return movimientos.filter((m) => {
      if (filtroTipo !== 'TODOS' && m.tipo !== filtroTipo) return false;
      if (soloPendientes && !m.comprobantePendiente) return false;
      return true;
    });
  }, [movimientos, filtroTipo, soloPendientes]);

  const pendientesCount = useMemo(() => movimientos.filter((m) => m.comprobantePendiente).length, [movimientos]);

  return (
    <div>
      <div className="filter-bar">
        <div className="segmented">
          {(['TODOS', 'INGRESO', 'GASTO'] as FiltroTipo[]).map((tipo) => (
            <button
              key={tipo}
              className={filtroTipo === tipo ? 'active' : ''}
              onClick={() => setFiltroTipo(tipo)}
              type="button"
            >
              {tipo === 'TODOS' ? 'Todos' : tipo === 'INGRESO' ? 'Ingresos' : 'Gastos'}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`chip chip-toggle ${soloPendientes ? 'active' : ''}`}
          onClick={() => setSoloPendientes((v) => !v)}
        >
          Comprobante pendiente{pendientesCount > 0 ? ` (${pendientesCount})` : ''}
        </button>
      </div>

      {visibles.length === 0 ? (
        <p className="empty-state">No hay movimientos que coincidan con el filtro.</p>
      ) : (
        <div className="movement-list">
          {visibles.map((m) => (
            <div key={m.id} className="card movement-card">
              <div className="row-top">
                <span className="concepto">{m.concepto}</span>
                <span className={`monto ${m.tipo === 'INGRESO' ? 'ingreso' : ''}`}>
                  {m.tipo === 'INGRESO' ? '+' : '-'}
                  {currency.format(m.monto)}
                </span>
              </div>
              <div className="meta">
                <span>{formatFecha(m.fecha)}</span>
                {m.categoria && <span>· {m.categoria}</span>}
                {m.bien && <span>· {m.bien}</span>}
              </div>
              {m.notas && <div className="meta">{m.notas}</div>}

              <div className="meta">
                {m.comprobantePendiente ? (
                  <span className="chip chip--pending">Comprobante pendiente</span>
                ) : (
                  <a className="chip" href={m.comprobanteUrl} target="_blank" rel="noreferrer">
                    Ver comprobante
                  </a>
                )}
              </div>

              {isAdmin && (
                <div className="actions">
                  {m.comprobantePendiente && (
                    <button type="button" className="btn-plain" onClick={() => onRequestAttach(m)}>
                      Adjuntar comprobante
                    </button>
                  )}
                  <button type="button" className="btn-plain" onClick={() => onRequestDelete(m)}>
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
