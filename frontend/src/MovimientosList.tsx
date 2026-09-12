import { useEffect, useMemo, useRef, useState } from 'react';
import type { FiltroTipo, Movimiento } from './types';

interface Props {
  movimientos: Movimiento[];
}

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function formatFecha(fecha: string): string {
  const date = new Date(fecha);
  return Number.isNaN(date.getTime()) ? fecha : dateFormatter.format(date);
}

export default function MovimientosList({ movimientos }: Props) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const filtrosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFiltros) return;

    function handleOutside(e: MouseEvent) {
      if (filtrosRef.current && !filtrosRef.current.contains(e.target as Node)) {
        setShowFiltros(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowFiltros(false);
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showFiltros]);

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
        <div className="dropdown-wrapper" ref={filtrosRef}>
          <button
            type="button"
            className={`chip chip-toggle ${soloPendientes ? 'active' : ''}`}
            onClick={() => setShowFiltros((v) => !v)}
            aria-expanded={showFiltros}
          >
            Filtros
          </button>
          {showFiltros && (
            <div className="dropdown-panel dropdown-panel--center">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={soloPendientes}
                  onChange={(e) => setSoloPendientes(e.target.checked)}
                />
                Con comprobante pendiente{pendientesCount > 0 ? ` (${pendientesCount})` : ''}
              </label>
            </div>
          )}
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="empty-state">No hay movimientos que coincidan con el filtro.</p>
      ) : (
        <div className="movement-list">
          {visibles.map((m) => (
            <div key={m.id} className="card movement-card">
              <div className="row-top">
                <span className="concepto">
                  {m.concepto}
                  {m.comprobantePendiente && (
                    <span className="badge-pending" title="Comprobante pendiente">
                      🧾
                    </span>
                  )}
                </span>
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

              {!m.comprobantePendiente && (
                <div className="meta">
                  <a className="chip" href={m.comprobanteUrl} target="_blank" rel="noreferrer">
                    Ver comprobante
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
