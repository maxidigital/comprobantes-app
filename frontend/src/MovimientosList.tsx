import { useMemo, useRef, useState } from 'react';
import { bienColor } from './bienes';
import { formatFecha, formatMontoPartes } from './format';
import { MegaphoneIcon } from './icons';
import type { Aviso, FiltroTipo, Movimiento } from './types';

interface Props {
  movimientos: Movimiento[];
  avisos: Aviso[];
  filtroTipo: FiltroTipo;
  soloPendientes: boolean;
  bienesSeleccionados: Set<string>;
  fechaDesde: string | null;
  fechaHasta: string | null;
  mostrarAvisos: boolean;
  puedeEditar: boolean;
  onOpenDetail: (movimiento: Movimiento) => void;
  onEdit: (movimiento: Movimiento) => void;
  onDelete: (movimiento: Movimiento) => void;
  onDeleteAviso: (aviso: Aviso) => void;
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

/** Movimientos y avisos son entidades separadas (avisos no pesan en Totals ni
 * en el balance) pero se intercalan por fecha para verlos en una sola línea
 * de tiempo — esta unión discriminada es solo para el render de la lista. */
type Item =
  | { kind: 'movimiento'; id: string; fecha: string; bien: string; movimiento: Movimiento }
  | { kind: 'aviso'; id: string; fecha: string; bien: string; aviso: Aviso };

export default function MovimientosList({
  movimientos,
  avisos,
  filtroTipo,
  soloPendientes,
  bienesSeleccionados,
  fechaDesde,
  fechaHasta,
  mostrarAvisos,
  puedeEditar,
  onOpenDetail,
  onEdit,
  onDelete,
  onDeleteAviso,
}: Props) {
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [, forceRender] = useState(0);

  const itemsCombinados = useMemo(() => {
    const items: Item[] = [
      ...movimientos.map(
        (m): Item => ({ kind: 'movimiento', id: `mov-${m.id}`, fecha: m.fecha, bien: m.bien, movimiento: m }),
      ),
      ...(mostrarAvisos
        ? avisos.map((a): Item => ({ kind: 'aviso', id: `aviso-${a.id}`, fecha: a.fecha, bien: a.bien, aviso: a }))
        : []),
    ];

    items.sort((x, y) => {
      if (x.fecha !== y.fecha) return x.fecha < y.fecha ? 1 : -1;
      const creadoX = x.kind === 'movimiento' ? x.movimiento.creadoEn : x.aviso.creadoEn;
      const creadoY = y.kind === 'movimiento' ? y.movimiento.creadoEn : y.aviso.creadoEn;
      return creadoX < creadoY ? 1 : creadoX > creadoY ? -1 : 0;
    });

    return items;
  }, [movimientos, avisos, mostrarAvisos]);

  const visibles = useMemo(() => {
    return itemsCombinados.filter((item) => {
      if (item.kind === 'movimiento') {
        if (filtroTipo !== 'TODOS' && item.movimiento.tipo !== filtroTipo) return false;
        if (soloPendientes && !item.movimiento.comprobantePendiente) return false;
      }
      if (bienesSeleccionados.size > 0 && !bienesSeleccionados.has(item.bien)) return false;
      if (fechaDesde && item.fecha < fechaDesde) return false;
      if (fechaHasta && item.fecha > fechaHasta) return false;
      return true;
    });
  }, [itemsCombinados, filtroTipo, soloPendientes, bienesSeleccionados, fechaDesde, fechaHasta]);

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

  function handlePointerUp(id: string, item: Item) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.id !== id) return;

    // Nunca llegó a moverse lo suficiente como para "trabar" una dirección
    // (locked sigue null) — eso es un tap real, no un intento de swipe.
    if (drag.locked === null || (drag.locked === 'horizontal' && Math.abs(drag.deltaX) < TAP_THRESHOLD)) {
      if (openSwipeId) {
        setOpenSwipeId(null);
      } else if (item.kind === 'movimiento') {
        onOpenDetail(item.movimiento);
      }
      forceRender((n) => n + 1);
      return;
    }

    if (drag.locked !== 'horizontal') {
      forceRender((n) => n + 1);
      return;
    }

    if (drag.deltaX < -SWIPE_OPEN_THRESHOLD && puedeEditar) {
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
    <>
      {visibles.length === 0 ? (
        <p className="empty-state">No hay movimientos que coincidan con el filtro.</p>
      ) : (
        <div className="movement-list">
          {visibles.map((item) => {
            if (item.kind === 'aviso') {
              const a = item.aviso;
              return (
                <div key={item.id} className="swipe-row">
                  {puedeEditar && (
                    <div className="swipe-actions">
                      <button
                        type="button"
                        className="swipe-action swipe-action--delete"
                        onClick={() => {
                          setOpenSwipeId(null);
                          onDeleteAviso(a);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}

                  <div
                    className="card movement-card"
                    style={{
                      boxShadow: `0 0 0 1px color-mix(in srgb, ${bienColor(a.bien)} 55%, transparent)`,
                      transform: `translateX(${rowTransform(item.id)}px)`,
                      transition: dragRef.current?.id === item.id ? 'none' : undefined,
                    }}
                    onPointerDown={(e) => handlePointerDown(e, item.id)}
                    onPointerMove={(e) => handlePointerMove(e, item.id)}
                    onPointerUp={() => handlePointerUp(item.id, item)}
                    onPointerCancel={() => {
                      dragRef.current = null;
                      forceRender((n) => n + 1);
                    }}
                  >
                    <div className="row-top">
                      <span className="concepto">
                        <MegaphoneIcon className="icon-inline" /> {a.texto}
                      </span>
                    </div>
                    <div className="row-bottom">
                      <span className="meta">
                        {formatFecha(a.fecha)}
                        {a.autor ? ` · ${a.autor}` : ''}
                      </span>
                      <span className="bien-label" style={{ color: bienColor(a.bien) }}>
                        {a.bien}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            const m = item.movimiento;
            const montoPartes = formatMontoPartes(m.monto);
            return (
              <div key={item.id} className="swipe-row">
                {puedeEditar && (
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
                )}

                <div
                  className={`card movement-card ${m.comprobantePendiente ? 'movement-card--pendiente' : ''}`}
                  style={{
                    transform: `translateX(${rowTransform(item.id)}px)`,
                    transition: dragRef.current?.id === item.id ? 'none' : undefined,
                  }}
                  onPointerDown={(e) => handlePointerDown(e, item.id)}
                  onPointerMove={(e) => handlePointerMove(e, item.id)}
                  onPointerUp={() => handlePointerUp(item.id, item)}
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
                    <span className={`monto ${m.tipo === 'INGRESO' ? 'ingreso' : 'gasto'}`}>
                      {m.tipo === 'INGRESO' ? '+' : '-'}
                      {montoPartes.principal}
                      <span className="monto-centavos">{montoPartes.centavos}</span>
                    </span>
                  </div>
                  <div className="row-bottom">
                    <span className="meta">{formatFecha(m.fecha)}</span>
                    {m.bien && (
                      <span className="bien-label" style={{ color: bienColor(m.bien) }}>
                        {m.bien}
                      </span>
                    )}
                  </div>
                  {m.notas && <div className="meta">{m.notas}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
