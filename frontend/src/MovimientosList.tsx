import { useMemo } from 'react';
import { bienColor } from './bienes';
import { formatFecha, formatMontoPartes } from './format';
import { MegaphoneIcon } from './icons';
import { notasPlano } from './Notas';
import type { Aviso, FiltroTipo, Movimiento } from './types';
import { useSwipeRows } from './useSwipeRows';

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
  const { cardProps, closeSwipe } = useSwipeRows(puedeEditar);

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
                          closeSwipe();
                          onDeleteAviso(a);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}

                  <div
                    className="card movement-card"
                    {...cardProps(
                      item.id,
                      () => {},
                      a.bien
                        ? { boxShadow: `0 0 0 1px color-mix(in srgb, ${bienColor(a.bien)} 55%, transparent)` }
                        : undefined,
                    )}
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
                      {a.bien && (
                        <span className="bien-label" style={{ color: bienColor(a.bien) }}>
                          {a.bien}
                        </span>
                      )}
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
                        closeSwipe();
                        onEdit(m);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="swipe-action swipe-action--delete"
                      onClick={() => {
                        closeSwipe();
                        onDelete(m);
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                )}

                <div
                  className={`card movement-card ${m.comprobantePendiente ? 'movement-card--pendiente' : ''}`}
                  {...cardProps(item.id, () => onOpenDetail(m))}
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
                  {m.notas && <div className="meta">{notasPlano(m.notas)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
