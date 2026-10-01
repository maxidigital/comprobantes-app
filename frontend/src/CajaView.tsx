import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError, eliminarEnCaja, listCaja } from './api';
import CajaDetail from './CajaDetail';
import CajaForm from './CajaForm';
import { APORTANTES, type CajaConfig } from './cajas';
import ConfirmDialog from './ConfirmDialog';
import FilterBar from './FilterBar';
import { formatFecha, formatMontoPartes } from './format';
import Totals from './Totals';
import type { FiltroTipo, MovimientoCaja } from './types';
import { useEscapeKey } from './useEscapeKey';
import { useSwipeRows } from './useSwipeRows';

interface Props {
  caja: CajaConfig;
  puedeEditar: boolean;
  /** Lugar dentro del encabezado fijo de App donde va la barra de filtros (para que quede pegada igual que en la sucesión). */
  filterSlot: HTMLElement | null;
  onUnauthorized: () => void;
}

/**
 * Vista completa de una caja simple (hoy solo Aportes personales): misma
 * pantalla que la sucesión — barra de filtros, lista con swipe, detalle al
 * tocar, totales en el chip de Informes — sin comprobantes ni avisos.
 * Maneja su propio estado; App.tsx solo elige qué caja mostrar.
 */
export default function CajaView({ caja, puedeEditar, filterSlot, onUnauthorized }: Props) {
  const [items, setItems] = useState<MovimientoCaja[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [aportantesSeleccionados, setAportantesSeleccionados] = useState<Set<string>>(new Set());
  const [fechaDesde, setFechaDesde] = useState<string | null>(null);
  const [fechaHasta, setFechaHasta] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<MovimientoCaja | null>(null);
  const [detailTarget, setDetailTarget] = useState<MovimientoCaja | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MovimientoCaja | null>(null);
  const [showInformes, setShowInformes] = useState(false);
  const { cardProps, closeSwipe } = useSwipeRows(puedeEditar);

  useEscapeKey(() => setShowInformes(false));

  useEffect(() => {
    let cancelado = false;
    setItems(null);
    setLoadError(null);
    listCaja(caja.id)
      .then((data) => {
        if (!cancelado) setItems(data);
      })
      .catch((err) => {
        if (cancelado) return;
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar la caja');
      });
    return () => {
      cancelado = true;
    };
  }, [caja.id]);

  const visibles = useMemo(
    () =>
      [...(items ?? [])]
        .filter((m) => {
          if (filtroTipo !== 'TODOS' && m.tipo !== filtroTipo) return false;
          if (aportantesSeleccionados.size > 0 && !aportantesSeleccionados.has(m.aportante ?? '')) return false;
          if (fechaDesde && m.fecha < fechaDesde) return false;
          if (fechaHasta && m.fecha > fechaHasta) return false;
          return true;
        })
        .sort((x, y) => {
          if (x.fecha !== y.fecha) return x.fecha < y.fecha ? 1 : -1;
          return x.creadoEn < y.creadoEn ? 1 : x.creadoEn > y.creadoEn ? -1 : 0;
        }),
    [items, filtroTipo, aportantesSeleccionados, fechaDesde, fechaHasta],
  );

  const aniosConDatos = useMemo(() => {
    const anios = new Set<number>([new Date().getFullYear()]);
    for (const m of items ?? []) anios.add(Number(m.fecha.slice(0, 4)));
    return [...anios].sort((a, b) => a - b);
  }, [items]);

  /** Saldo por aportante (aportado - devuelto) = lo que la sucesión le debe a cada uno. Sobre todo, no sobre lo filtrado. */
  const saldosPorAportante = useMemo(() => {
    if (!caja.conAportante) return [];
    const saldos = new Map<string, number>();
    for (const m of items ?? []) {
      const nombre = m.aportante || 'Sin aportante';
      saldos.set(nombre, (saldos.get(nombre) ?? 0) + (m.tipo === 'INGRESO' ? m.monto : -m.monto));
    }
    return [...saldos.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, caja.conAportante]);

  function toggleAportante(nombre: string) {
    setAportantesSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(nombre)) {
        next.delete(nombre);
      } else {
        next.add(nombre);
      }
      return next;
    });
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await eliminarEnCaja(caja.id, deleteTarget.id);
      setItems((prev) => (prev ? prev.filter((m) => m.id !== deleteTarget.id) : prev));
      setDeleteTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setDeleteTarget(null);
      setLoadError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: caja.moneda });

  return (
    <>
      {items !== null &&
        filterSlot &&
        createPortal(
          <FilterBar
            filtroTipo={filtroTipo}
            onFiltroTipoChange={setFiltroTipo}
            etiquetasTipo={caja.etiquetasFiltro}
            categorias={
              caja.conAportante
                ? { opciones: APORTANTES, seleccionadas: aportantesSeleccionados, onToggle: toggleAportante }
                : undefined
            }
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            onFechaRangeChange={(desde, hasta) => {
              setFechaDesde(desde);
              setFechaHasta(hasta);
            }}
            aniosConDatos={aniosConDatos}
            onInformes={() => setShowInformes(true)}
          />,
          filterSlot,
        )}

      <main className="content">
        {items === null && !loadError && <p className="empty-state">Cargando…</p>}
        {loadError && <p className="error-text">{loadError}</p>}

        {items !== null &&
          (visibles.length === 0 ? (
            <p className="empty-state">
              {items.length === 0 ? `Todavía no hay nada cargado en ${caja.titulo}.` : 'Nada coincide con el filtro.'}
            </p>
          ) : (
            <div className="movement-list">
              {visibles.map((m) => {
                const montoPartes = formatMontoPartes(m.monto, caja.moneda);
                return (
                  <div key={m.id} className="swipe-row">
                    {puedeEditar && (
                      <div className="swipe-actions">
                        <button
                          type="button"
                          className="swipe-action swipe-action--edit"
                          onClick={() => {
                            closeSwipe();
                            setEditTarget(m);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="swipe-action swipe-action--delete"
                          onClick={() => {
                            closeSwipe();
                            setDeleteTarget(m);
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}

                    <div className="card movement-card" {...cardProps(m.id, () => setDetailTarget(m))}>
                      <div className="row-top">
                        <span className="concepto">{m.concepto}</span>
                        <span className={`monto ${m.tipo === 'INGRESO' ? 'ingreso' : 'gasto'}`}>
                          {m.tipo === 'INGRESO' ? '+' : '-'}
                          {montoPartes.principal}
                          <span className="monto-centavos">{montoPartes.centavos}</span>
                        </span>
                      </div>
                      <div className="row-bottom">
                        <span className="meta">{formatFecha(m.fecha)}</span>
                        {m.aportante && <span className="bien-label">{m.aportante}</span>}
                      </div>
                      {m.notas && <div className="meta">{m.notas}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </main>

      {puedeEditar && (
        <button className="fab" onClick={() => setShowForm(true)} aria-label={`Nuevo en ${caja.titulo}`}>
          +
        </button>
      )}

      {(showForm || editTarget) && (
        <CajaForm
          caja={caja}
          editing={editTarget ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditTarget(null);
          }}
          onSaved={(guardado) => {
            setItems((prev) => {
              if (!prev) return prev;
              return editTarget ? prev.map((x) => (x.id === guardado.id ? guardado : x)) : [guardado, ...prev];
            });
            setShowForm(false);
            setEditTarget(null);
          }}
          onUnauthorized={onUnauthorized}
        />
      )}

      {detailTarget && (
        <CajaDetail
          caja={caja}
          item={detailTarget}
          puedeEditar={puedeEditar}
          onClose={() => setDetailTarget(null)}
          onEdit={(m) => {
            setDetailTarget(null);
            setEditTarget(m);
          }}
          onDelete={(m) => {
            setDetailTarget(null);
            setDeleteTarget(m);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Eliminar"
          message={`¿Eliminar "${deleteTarget.concepto}" de ${caja.titulo}? Esta acción no se puede deshacer desde la app.`}
          confirmLabel="Eliminar"
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {showInformes && items !== null && (
        <div className="dialog-overlay" onClick={() => setShowInformes(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Informes · {caja.titulo}</h2>
            <Totals movimientos={items} moneda={caja.moneda} etiquetas={caja.etiquetasTotales} />
            {saldosPorAportante.length > 0 && (
              <>
                <p className="field-hint">Se le debe a:</p>
                <div className="aportantes-saldos">
                  {saldosPorAportante.map(([nombre, saldo]) => (
                    <span key={nombre} className="chip">
                      {nombre}: {currency.format(saldo)}
                    </span>
                  ))}
                </div>
              </>
            )}
            <div className="dialog-actions">
              <button type="button" className="btn-plain" onClick={() => setShowInformes(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
