import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError, eliminarAviso, eliminarEnCaja, listAvisos, listCaja } from './api';
import AvisoCard from './AvisoCard';
import AvisoDetail from './AvisoDetail';
import AvisoForm from './AvisoForm';
import CajaDetail from './CajaDetail';
import CajaForm from './CajaForm';
import { guardarCache, leerCache } from './cache';
import { APORTANTES, type CajaConfig } from './cajas';
import ConfirmDialog from './ConfirmDialog';
import FilterBar from './FilterBar';
import { notasPlano } from './Notas';
import { formatFecha, formatMontoPartes } from './format';
import ReceiptViewerDialog from './ReceiptViewerDialog';
import Totals from './Totals';
import type { Aviso, FiltroAvisos, FiltroTipo, MovimientoCaja } from './types';
import { useEscapeKey } from './useEscapeKey';
import { useSwipeRows } from './useSwipeRows';

interface Props {
  caja: CajaConfig;
  puedeEditar: boolean;
  /** Filtro Ingresos/Egresos compartido por todas las cajas (vive en App). */
  filtroTipo: FiltroTipo;
  /** Lugar dentro del encabezado fijo de App donde va la barra de filtros (para que quede pegada igual que en la sucesión). */
  filterSlot: HTMLElement | null;
  onUnauthorized: () => void;
}

/**
 * Vista completa de una caja simple (hoy solo Aportes personales): misma
 * pantalla que Alquileres — barra de filtros, lista con swipe, detalle al
 * tocar, totales en el chip de Informes, avisos intercalados por fecha —
 * sin comprobantes ni rangos de fechas.
 * Maneja su propio estado; App.tsx solo elige qué caja mostrar.
 */
export default function CajaView({ caja, puedeEditar, filtroTipo, filterSlot, onUnauthorized }: Props) {
  const [items, setItems] = useState<MovimientoCaja[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [aportantesSeleccionados, setAportantesSeleccionados] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<MovimientoCaja | null>(null);
  const [detailTarget, setDetailTarget] = useState<MovimientoCaja | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MovimientoCaja | null>(null);
  const [showInformes, setShowInformes] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [filtroAvisos, setFiltroAvisos] = useState<FiltroAvisos>('TODOS');
  const [showCrearMenu, setShowCrearMenu] = useState(false);
  const [showAvisoForm, setShowAvisoForm] = useState(false);
  const [deleteAvisoTarget, setDeleteAvisoTarget] = useState<Aviso | null>(null);
  const [editAvisoTarget, setEditAvisoTarget] = useState<Aviso | null>(null);
  const [avisoDetailTarget, setAvisoDetailTarget] = useState<Aviso | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{ avisoId: string; comprobanteId: string } | null>(null);
  const fabMenuRef = useRef<HTMLDivElement>(null);
  const { cardProps, closeSwipe } = useSwipeRows(puedeEditar);

  useEscapeKey(() => setShowInformes(false));

  useEffect(() => {
    let cancelado = false;
    // Lo último que se vio aparece al instante; lo fresco lo reemplaza al llegar.
    setItems(leerCache<MovimientoCaja[]>(caja.id));
    setLoadError(null);
    // Un caché de antes de que los avisos tuvieran comprobantes no trae esa lista.
    setAvisos(
      caja.conAvisos
        ? (leerCache<Aviso[]>(`${caja.id}.avisos`) ?? []).map((a) => ({ ...a, comprobantes: a.comprobantes ?? [] }))
        : [],
    );
    Promise.all([listCaja(caja.id), caja.conAvisos ? listAvisos(caja.id) : Promise.resolve([])])
      .then(([data, avisosData]) => {
        if (cancelado) return;
        setItems(data);
        setAvisos(avisosData);
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

  useEffect(() => {
    if (items !== null) guardarCache(caja.id, items);
  }, [items, caja.id]);

  useEffect(() => {
    if (caja.conAvisos && items !== null) guardarCache(`${caja.id}.avisos`, avisos);
  }, [avisos, items, caja.id, caja.conAvisos]);

  useEffect(() => {
    if (!showCrearMenu) return;
    function handleOutside(e: MouseEvent) {
      if (fabMenuRef.current && !fabMenuRef.current.contains(e.target as Node)) setShowCrearMenu(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showCrearMenu]);

  /** Aportes y avisos intercalados por fecha (los avisos no pesan en los totales). El filtro de tipo y el de aportante no les aplican a los avisos. */
  type Item = { kind: 'aporte'; id: string; item: MovimientoCaja } | { kind: 'aviso'; id: string; aviso: Aviso };
  const visibles = useMemo(() => {
    const lista: Item[] = [
      ...(filtroAvisos !== 'SOLO_AVISOS'
        ? (items ?? [])
            .filter((m) => {
              if (filtroTipo !== 'TODOS' && m.tipo !== filtroTipo) return false;
              if (aportantesSeleccionados.size > 0 && !aportantesSeleccionados.has(m.aportante ?? '')) return false;
              return true;
            })
            .map((m): Item => ({ kind: 'aporte', id: `mov-${m.id}`, item: m }))
        : []),
      ...(filtroAvisos !== 'SIN_AVISOS' ? avisos.map((a): Item => ({ kind: 'aviso', id: `aviso-${a.id}`, aviso: a })) : []),
    ];
    const fecha = (x: Item) => (x.kind === 'aporte' ? x.item.fecha : x.aviso.fecha);
    const creado = (x: Item) => (x.kind === 'aporte' ? x.item.creadoEn : x.aviso.creadoEn);
    return lista.sort((x, y) => {
      if (fecha(x) !== fecha(y)) return fecha(x) < fecha(y) ? 1 : -1;
      return creado(x) < creado(y) ? 1 : creado(x) > creado(y) ? -1 : 0;
    });
  }, [items, avisos, filtroTipo, aportantesSeleccionados, filtroAvisos]);

  /** Por aportante: aportado, devuelto y saldo (lo que la sucesión le debe). Sobre todo, no sobre lo filtrado. */
  const resumenPorAportante = useMemo(() => {
    if (!caja.conAportante) return [];
    const resumen = new Map<string, { aportado: number; devuelto: number }>();
    for (const m of items ?? []) {
      const nombre = m.aportante || 'Sin aportante';
      const r = resumen.get(nombre) ?? { aportado: 0, devuelto: 0 };
      if (m.tipo === 'INGRESO') r.aportado += m.monto;
      else r.devuelto += m.monto;
      resumen.set(nombre, r);
    }
    return [...resumen.entries()]
      .map(([nombre, r]) => ({ nombre, ...r, saldo: r.aportado - r.devuelto }))
      .sort((a, b) => b.saldo - a.saldo);
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

  async function handleConfirmDeleteAviso() {
    if (!deleteAvisoTarget) return;
    try {
      await eliminarAviso(caja.id, deleteAvisoTarget.id);
      setAvisos((prev) => prev.filter((a) => a.id !== deleteAvisoTarget.id));
      setDeleteAvisoTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setDeleteAvisoTarget(null);
      setLoadError(err instanceof Error ? err.message : 'No se pudo eliminar el aviso');
    }
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
            categorias={
              caja.conAportante
                ? { opciones: APORTANTES, seleccionadas: aportantesSeleccionados, onToggle: toggleAportante }
                : undefined
            }
            avisos={caja.conAvisos ? { filtro: filtroAvisos, onChange: setFiltroAvisos } : undefined}
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
              {items.length === 0 && avisos.length === 0
                ? `Todavía no hay nada cargado en ${caja.titulo}.`
                : 'Nada coincide con el filtro.'}
            </p>
          ) : (
            <div className="movement-list">
              {visibles.map((entrada) => {
                if (entrada.kind === 'aviso') {
                  const a = entrada.aviso;
                  return (
                    <AvisoCard
                      key={entrada.id}
                      aviso={a}
                      puedeEditar={puedeEditar}
                      swipeProps={cardProps(entrada.id, () => setAvisoDetailTarget(a))}
                      onEdit={() => {
                        closeSwipe();
                        setEditAvisoTarget(a);
                      }}
                      onDelete={() => {
                        closeSwipe();
                        setDeleteAvisoTarget(a);
                      }}
                    />
                  );
                }
                const m = entrada.item;
                const montoPartes = formatMontoPartes(m.monto, caja.moneda);
                return (
                  <div key={entrada.id} className="swipe-row">
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

                    <div className="card movement-card" {...cardProps(entrada.id, () => setDetailTarget(m))}>
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
                      {m.notas && <div className="meta">{notasPlano(m.notas)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </main>

      {puedeEditar &&
        (caja.conAvisos ? (
          <div ref={fabMenuRef}>
            <button
              className="fab"
              onClick={() => setShowCrearMenu((v) => !v)}
              aria-label={`Nuevo en ${caja.titulo}`}
              aria-expanded={showCrearMenu}
            >
              +
            </button>
            {showCrearMenu && (
              <div className="dropdown-panel fab-menu">
                <button
                  type="button"
                  onClick={() => {
                    setShowCrearMenu(false);
                    setShowForm(true);
                  }}
                >
                  Nuevo {caja.etiquetasTipo.ingreso.toLowerCase()}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCrearMenu(false);
                    setShowAvisoForm(true);
                  }}
                >
                  Nuevo aviso
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="fab" onClick={() => setShowForm(true)} aria-label={`Nuevo en ${caja.titulo}`}>
            +
          </button>
        ))}

      {(showAvisoForm || editAvisoTarget) && (
        <AvisoForm
          caja={caja.id}
          editing={editAvisoTarget ?? undefined}
          onClose={() => {
            setShowAvisoForm(false);
            setEditAvisoTarget(null);
          }}
          onSaved={(a) => {
            setAvisos((prev) => (editAvisoTarget ? prev.map((x) => (x.id === a.id ? a : x)) : [a, ...prev]));
            setShowAvisoForm(false);
            setEditAvisoTarget(null);
          }}
          onUnauthorized={onUnauthorized}
        />
      )}

      {avisoDetailTarget && (
        <AvisoDetail
          aviso={avisoDetailTarget}
          conBien={false}
          puedeEditar={puedeEditar}
          onClose={() => setAvisoDetailTarget(null)}
          onVerComprobante={(comprobanteId) => setViewingReceipt({ avisoId: avisoDetailTarget.id, comprobanteId })}
          onEdit={(a) => {
            setAvisoDetailTarget(null);
            setEditAvisoTarget(a);
          }}
          onDelete={(a) => {
            setAvisoDetailTarget(null);
            setDeleteAvisoTarget(a);
          }}
        />
      )}

      {viewingReceipt && (
        <ReceiptViewerDialog
          caja={caja.id}
          movimientoId={viewingReceipt.avisoId}
          entidad="avisos"
          comprobanteId={viewingReceipt.comprobanteId}
          onClose={() => setViewingReceipt(null)}
          onUnauthorized={onUnauthorized}
        />
      )}

      {deleteAvisoTarget && (
        <ConfirmDialog
          title="Eliminar aviso"
          message="¿Eliminar este aviso? Esta acción no se puede deshacer desde la app."
          confirmLabel="Eliminar"
          onClose={() => setDeleteAvisoTarget(null)}
          onConfirm={handleConfirmDeleteAviso}
        />
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
            {resumenPorAportante.length > 0 && (
              <table className="informe-tabla">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Aporte</th>
                    <th>Devuelto</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenPorAportante.map((r) => (
                    <tr key={r.nombre}>
                      <td>{r.nombre}</td>
                      <td>{currency.format(r.aportado)}</td>
                      <td>{currency.format(r.devuelto)}</td>
                      <td className={r.saldo < 0 ? 'negative' : ''}>{currency.format(r.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
