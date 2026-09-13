import { useEffect, useMemo, useRef, useState } from 'react';
import { comprobanteArchivoUrl } from './api';
import { currency, formatFecha } from './format';
import type { FiltroTipo, Movimiento } from './types';

interface Props {
  movimientos: Movimiento[];
  onOpenDetail: (movimiento: Movimiento) => void;
  onEdit: (movimiento: Movimiento) => void;
  onDelete: (movimiento: Movimiento) => void;
}

const SWIPE_ACTIONS_WIDTH = 160;
const SWIPE_OPEN_THRESHOLD = 50;
const TAP_THRESHOLD = 8;

interface DragState {
  id: string;
  startX: number;
  startY: number;
  deltaX: number;
  wasOpen: boolean;
  locked: 'horizontal' | 'vertical' | null;
}

export default function MovimientosList({ movimientos, onOpenDetail, onEdit, onDelete }: Props) {
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [showFiltros, setShowFiltros] = useState(false);
  const filtrosRef = useRef<HTMLDivElement>(null);

  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [, forceRender] = useState(0);

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

  function handlePointerDown(e: React.PointerEvent, id: string) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      deltaX: 0,
      wasOpen: openSwipeId === id,
      locked: null,
    };
  }

  function handlePointerMove(e: React.PointerEvent, id: string) {
    const drag = dragRef.current;
    if (!drag || drag.id !== id) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (!drag.locked) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      drag.locked = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }
    if (drag.locked !== 'horizontal') return;

    drag.deltaX = dx;
    forceRender((n) => n + 1);
  }

  function handlePointerUp(id: string, m: Movimiento) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.id !== id) return;

    // Nunca llegó a moverse lo suficiente como para "trabar" una dirección
    // (locked sigue null) — eso es un tap real, no un intento de swipe.
    if (drag.locked === null || (drag.locked === 'horizontal' && Math.abs(drag.deltaX) < TAP_THRESHOLD)) {
      if (openSwipeId) {
        setOpenSwipeId(null);
      } else {
        onOpenDetail(m);
      }
      forceRender((n) => n + 1);
      return;
    }

    if (drag.locked !== 'horizontal') {
      forceRender((n) => n + 1);
      return;
    }

    if (drag.deltaX < -SWIPE_OPEN_THRESHOLD) {
      setOpenSwipeId(id);
    } else if (drag.deltaX > SWIPE_OPEN_THRESHOLD) {
      setOpenSwipeId(null);
    } else {
      setOpenSwipeId(drag.wasOpen ? id : null);
    }
    forceRender((n) => n + 1);
  }

  function rowTransform(id: string): number {
    const drag = dragRef.current;
    const base = openSwipeId === id ? -SWIPE_ACTIONS_WIDTH : 0;
    if (drag && drag.id === id && drag.locked === 'horizontal') {
      const start = drag.wasOpen ? -SWIPE_ACTIONS_WIDTH : 0;
      return Math.min(0, Math.max(-SWIPE_ACTIONS_WIDTH, start + drag.deltaX));
    }
    return base;
  }

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
            <div className="dropdown-panel">
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
            <div key={m.id} className="swipe-row">
              <div className="swipe-actions">
                <button
                  type="button"
                  className="swipe-action swipe-action--edit"
                  onClick={() => {
                    setOpenSwipeId(null);
                    onEdit(m);
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="swipe-action swipe-action--delete"
                  onClick={() => {
                    setOpenSwipeId(null);
                    onDelete(m);
                  }}
                >
                  Eliminar
                </button>
              </div>

              <div
                className={`card movement-card ${m.tipo === 'INGRESO' ? 'movement-card--ingreso' : 'movement-card--gasto'}`}
                style={{
                  transform: `translateX(${rowTransform(m.id)}px)`,
                  transition: dragRef.current?.id === m.id ? 'none' : undefined,
                }}
                onPointerDown={(e) => handlePointerDown(e, m.id)}
                onPointerMove={(e) => handlePointerMove(e, m.id)}
                onPointerUp={() => handlePointerUp(m.id, m)}
                onPointerCancel={() => {
                  dragRef.current = null;
                  forceRender((n) => n + 1);
                }}
              >
                <div className="row-top">
                  <span className="concepto">
                    {m.concepto}
                    {m.comprobantePendiente && (
                      <span className="badge-pending" title="Comprobante pendiente">
                        !
                      </span>
                    )}
                  </span>
                  <span className={`monto ${m.tipo === 'INGRESO' ? 'ingreso' : ''}`}>
                    {m.tipo === 'INGRESO' ? '+' : '-'}
                    {currency.format(m.monto)}
                  </span>
                </div>
                <div className="row-bottom">
                  <span className="meta">
                    {formatFecha(m.fecha)}
                    {m.categoria && ` · ${m.categoria}`}
                  </span>
                  {m.bien && <span className="bien-label">{m.bien}</span>}
                </div>
                {m.notas && <div className="meta">{m.notas}</div>}

                {!m.comprobantePendiente && (
                  <div className="meta">
                    <a
                      className="chip"
                      href={comprobanteArchivoUrl(m.id)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver comprobante
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
