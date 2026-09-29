import { useEffect, useMemo, useState } from 'react';
import { ApiError, eliminarEnCaja, listCaja } from './api';
import CajaForm from './CajaForm';
import type { CajaConfig } from './cajas';
import ConfirmDialog from './ConfirmDialog';
import { formatFecha, formatMontoPartes } from './format';
import Totals from './Totals';
import type { MovimientoCaja } from './types';

interface Props {
  caja: CajaConfig;
  onUnauthorized: () => void;
}

/**
 * Vista completa de una caja de ADMIN (listado + totales + alta/edición).
 * Maneja su propio estado — App.tsx solo elige cuál mostrar. Más simple que
 * MovimientosList a propósito: sin filtros ni swipe, tocar una fila la abre
 * para editar y el borrado está adentro del formulario.
 */
export default function CajaView({ caja, onUnauthorized }: Props) {
  const [items, setItems] = useState<MovimientoCaja[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<MovimientoCaja | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MovimientoCaja | null>(null);

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

  const ordenados = useMemo(
    () =>
      [...(items ?? [])].sort((x, y) => {
        if (x.fecha !== y.fecha) return x.fecha < y.fecha ? 1 : -1;
        return x.creadoEn < y.creadoEn ? 1 : x.creadoEn > y.creadoEn ? -1 : 0;
      }),
    [items],
  );

  /** Aportes: saldo por aportante (aportado - devuelto) = lo que la sucesión le debe a cada uno. */
  const saldosPorAportante = useMemo(() => {
    if (!caja.conAportante) return [];
    const saldos = new Map<string, number>();
    for (const m of items ?? []) {
      const nombre = m.aportante || 'Sin aportante';
      saldos.set(nombre, (saldos.get(nombre) ?? 0) + (m.tipo === 'INGRESO' ? m.monto : -m.monto));
    }
    return [...saldos.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, caja.conAportante]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await eliminarEnCaja(caja.id, deleteTarget.id);
      setItems((prev) => (prev ? prev.filter((m) => m.id !== deleteTarget.id) : prev));
      setDeleteTarget(null);
      setEditTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setDeleteTarget(null);
      setLoadError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  const currency = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: caja.moneda,
    maximumFractionDigits: 0,
  });

  return (
    <>
      <main className="content">
        {items === null && !loadError && <p className="empty-state">Cargando…</p>}
        {loadError && <p className="error-text">{loadError}</p>}

        {items !== null && (
          <>
            <Totals movimientos={items} moneda={caja.moneda} etiquetas={caja.etiquetasTotales} />

            {saldosPorAportante.length > 0 && (
              <div className="aportantes-saldos">
                {saldosPorAportante.map(([nombre, saldo]) => (
                  <span key={nombre} className="chip">
                    {nombre}: {currency.format(saldo)}
                  </span>
                ))}
              </div>
            )}

            {ordenados.length === 0 ? (
              <p className="empty-state">Todavía no hay nada cargado en {caja.titulo}.</p>
            ) : (
              <div className="movement-list">
                {ordenados.map((m) => {
                  const montoPartes = formatMontoPartes(m.monto, caja.moneda);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className="card movement-card"
                      style={{ textAlign: 'left', width: '100%', font: 'inherit', color: 'inherit' }}
                      onClick={() => setEditTarget(m)}
                    >
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
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <button className="fab" onClick={() => setShowForm(true)} aria-label={`Nuevo en ${caja.titulo}`}>
        +
      </button>

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
          onDelete={(m) => setDeleteTarget(m)}
          onUnauthorized={onUnauthorized}
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
    </>
  );
}
