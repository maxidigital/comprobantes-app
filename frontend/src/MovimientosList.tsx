import { useMemo } from 'react';
import AvisoCard from './AvisoCard';
import { bienColor } from './bienes';
import { formatFecha, formatMontoPartes } from './format';
import { notasPlano } from './Notas';
import type { Aviso, FiltroAvisos, FiltroTipo, Movimiento } from './types';
import { useSwipeRows } from './useSwipeRows';

interface Props {
  movimientos: Movimiento[];
  avisos: Aviso[];
  filtroTipo: FiltroTipo;
  soloPendientes: boolean;
  bienesSeleccionados: Set<string>;
  fechaDesde: string | null;
  fechaHasta: string | null;
  filtroAvisos: FiltroAvisos;
  puedeEditar: boolean;
  onOpenDetail: (movimiento: Movimiento) => void;
  onEdit: (movimiento: Movimiento) => void;
  onDelete: (movimiento: Movimiento) => void;
  onEditAviso: (aviso: Aviso) => void;
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
  filtroAvisos,
  puedeEditar,
  onOpenDetail,
  onEdit,
  onDelete,
  onEditAviso,
  onDeleteAviso,
}: Props) {
  const { cardProps, closeSwipe } = useSwipeRows(puedeEditar);

  const itemsCombinados = useMemo(() => {
    const items: Item[] = [
      ...(filtroAvisos !== 'SOLO_AVISOS'
        ? movimientos.map(
            (m): Item => ({ kind: 'movimiento', id: `mov-${m.id}`, fecha: m.fecha, bien: m.bien, movimiento: m }),
          )
        : []),
      ...(filtroAvisos !== 'SIN_AVISOS'
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
  }, [movimientos, avisos, filtroAvisos]);

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
        <p className="empty-state">
          No hay {filtroAvisos === 'SOLO_AVISOS' ? 'avisos' : 'movimientos'} que coincidan con el filtro.
        </p>
      ) : (
        <div className="movement-list">
          {visibles.map((item) => {
            if (item.kind === 'aviso') {
              const a = item.aviso;
              return (
                <AvisoCard
                  key={item.id}
                  aviso={a}
                  puedeEditar={puedeEditar}
                  // Un aviso no tiene detalle: tocarlo lo abre para editar (si se puede).
                  swipeProps={cardProps(item.id, () => puedeEditar && onEditAviso(a))}
                  onEdit={() => {
                    closeSwipe();
                    onEditAviso(a);
                  }}
                  onDelete={() => {
                    closeSwipe();
                    onDeleteAviso(a);
                  }}
                />
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
