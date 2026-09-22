import { useEffect, useMemo, useRef, useState } from 'react';
import AccessGate from './AccessGate';
import AvisoForm from './AvisoForm';
import ConfirmDialog from './ConfirmDialog';
import FilterBar from './FilterBar';
import HeaderMenu from './HeaderMenu';
import { BellIcon } from './icons';
import MovimientoDetail from './MovimientoDetail';
import MovimientoForm from './MovimientoForm';
import MovimientosList from './MovimientosList';
import ReceiptViewerDialog from './ReceiptViewerDialog';
import Totals from './Totals';
import {
  ApiError,
  clearAccessKey,
  eliminarAviso,
  eliminarMovimiento,
  getAccessKey,
  getLastSeenNovedades,
  getUserRole,
  listAvisos,
  listMovimientos,
  setLastSeenNovedades,
} from './api';
import type { Aviso, FiltroTipo, Movimiento } from './types';
import { useEscapeKey } from './useEscapeKey';
import { useVersionCheck } from './useVersionCheck';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
}

export default function App() {
  const [unlocked, setUnlocked] = useState(!!getAccessKey());
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [novedadesCount, setNovedadesCount] = useState(0);
  const [theme, setTheme] = useState<Theme>(getInitialTheme());
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [bienesSeleccionados, setBienesSeleccionados] = useState<Set<string>>(new Set());
  const [fechaDesde, setFechaDesde] = useState<string | null>(null);
  const [fechaHasta, setFechaHasta] = useState<string | null>(null);
  const [mostrarAvisos, setMostrarAvisos] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Movimiento | null>(null);
  const [detailTarget, setDetailTarget] = useState<Movimiento | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{ movimientoId: string; comprobanteId: string } | null>(null);
  const [showInformes, setShowInformes] = useState(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<Movimiento | null>(null);
  const [showCrearMenu, setShowCrearMenu] = useState(false);
  const [showAvisoForm, setShowAvisoForm] = useState(false);
  const [confirmDeleteAvisoTarget, setConfirmDeleteAvisoTarget] = useState<Aviso | null>(null);
  const fabMenuRef = useRef<HTMLDivElement>(null);
  const puedeEditar = getUserRole() !== 'VIEWER';

  const pendientesCount = useMemo(
    () => (movimientos ?? []).filter((m) => m.comprobantePendiente).length,
    [movimientos],
  );

  function toggleBien(bien: string) {
    setBienesSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(bien)) {
        next.delete(bien);
      } else {
        next.add(bien);
      }
      return next;
    });
  }

  useEscapeKey(() => setShowInformes(false));
  useEscapeKey(() => setShowCrearMenu(false));
  useVersionCheck();

  useEffect(() => {
    if (unlocked) {
      refreshList();
    }
  }, [unlocked]);

  useEffect(() => {
    if (!showCrearMenu) return;
    function handleOutside(e: MouseEvent) {
      if (fabMenuRef.current && !fabMenuRef.current.contains(e.target as Node)) {
        setShowCrearMenu(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showCrearMenu]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('comprobantes.theme', theme);
  }, [theme]);

  async function refreshList() {
    setLoadError(null);
    try {
      const [movimientosData, avisosData] = await Promise.all([listMovimientos(), listAvisos()]);
      const lastSeen = getLastSeenNovedades();
      const nuevos = lastSeen
        ? [...movimientosData, ...avisosData].filter((item) => item.creadoEn > lastSeen).length
        : 0;
      setNovedadesCount(nuevos);
      setMovimientos(movimientosData);
      setAvisos(avisosData);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleUnauthorized();
        return;
      }
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar el listado');
    }
  }

  function handleDismissNovedades() {
    setLastSeenNovedades(new Date().toISOString());
    setNovedadesCount(0);
  }

  function handleUnauthorized() {
    clearAccessKey();
    setShowForm(false);
    setEditTarget(null);
    setDetailTarget(null);
    setViewingReceipt(null);
    setConfirmDeleteTarget(null);
    setShowCrearMenu(false);
    setShowAvisoForm(false);
    setConfirmDeleteAvisoTarget(null);
    setUnlocked(false);
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteTarget) return;
    try {
      await eliminarMovimiento(confirmDeleteTarget.id);
      setMovimientos((prev) => (prev ? prev.filter((m) => m.id !== confirmDeleteTarget.id) : prev));
      setConfirmDeleteTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleUnauthorized();
        return;
      }
      setLoadError(err instanceof Error ? err.message : 'No se pudo eliminar el movimiento');
    }
  }

  async function handleConfirmDeleteAviso() {
    if (!confirmDeleteAvisoTarget) return;
    try {
      await eliminarAviso(confirmDeleteAvisoTarget.id);
      setAvisos((prev) => prev.filter((a) => a.id !== confirmDeleteAvisoTarget.id));
      setConfirmDeleteAvisoTarget(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleUnauthorized();
        return;
      }
      setLoadError(err instanceof Error ? err.message : 'No se pudo eliminar el aviso');
    }
  }

  if (!unlocked) {
    return <AccessGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="app-shell">
      <div className="sticky-header">
        <header className="top-bar">
          <div>
            <h1>Administración</h1>
            <div className="subtitle">Sucesión Bottazzi</div>
          </div>
          <div className="top-bar-actions">
            <button
              type="button"
              className="btn-plain menu-icon-btn bell-btn"
              onClick={handleDismissNovedades}
              aria-label="Novedades"
              title={novedadesCount > 0 ? `${novedadesCount} novedades desde tu última visita` : 'Sin novedades'}
            >
              <BellIcon />
              {novedadesCount > 0 && <span className="badge-pending badge-novedades">{novedadesCount}</span>}
            </button>
            <HeaderMenu
              isDark={theme === 'dark'}
              onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              onRefresh={refreshList}
              onInformes={() => setShowInformes(true)}
              onLogout={handleUnauthorized}
            />
          </div>
        </header>

        {movimientos !== null && (
          <FilterBar
            filtroTipo={filtroTipo}
            onFiltroTipoChange={setFiltroTipo}
            soloPendientes={soloPendientes}
            onSoloPendientesChange={setSoloPendientes}
            bienesSeleccionados={bienesSeleccionados}
            onToggleBien={toggleBien}
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            onFechaRangeChange={(desde, hasta) => {
              setFechaDesde(desde);
              setFechaHasta(hasta);
            }}
            mostrarAvisos={mostrarAvisos}
            onToggleAvisos={() => setMostrarAvisos((v) => !v)}
            pendientesCount={pendientesCount}
          />
        )}
      </div>

      <main className="content">
        {movimientos === null && !loadError && <p className="empty-state">Cargando…</p>}
        {loadError && <p className="error-text">{loadError}</p>}

        {movimientos !== null && (
          <MovimientosList
            movimientos={movimientos}
            avisos={avisos}
            filtroTipo={filtroTipo}
            soloPendientes={soloPendientes}
            bienesSeleccionados={bienesSeleccionados}
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            mostrarAvisos={mostrarAvisos}
            puedeEditar={puedeEditar}
            onOpenDetail={(m) => setDetailTarget(m)}
            onEdit={(m) => setEditTarget(m)}
            onDelete={(m) => setConfirmDeleteTarget(m)}
            onDeleteAviso={(a) => setConfirmDeleteAvisoTarget(a)}
          />
        )}
      </main>

      {puedeEditar && (
        <div ref={fabMenuRef}>
          <button
            className="fab"
            onClick={() => setShowCrearMenu((v) => !v)}
            aria-label="Nuevo"
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
                Nuevo movimiento
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
      )}

      {(showForm || editTarget) && (
        <MovimientoForm
          editing={editTarget ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditTarget(null);
          }}
          onSaved={(m) => {
            setMovimientos((prev) => {
              if (!prev) return prev;
              return editTarget ? prev.map((x) => (x.id === m.id ? m : x)) : [m, ...prev];
            });
            setShowForm(false);
            setEditTarget(null);
          }}
          onUnauthorized={handleUnauthorized}
        />
      )}

      {showAvisoForm && (
        <AvisoForm
          onClose={() => setShowAvisoForm(false)}
          onSaved={(a) => {
            setAvisos((prev) => [a, ...prev]);
            setShowAvisoForm(false);
          }}
          onUnauthorized={handleUnauthorized}
        />
      )}

      {detailTarget && (
        <MovimientoDetail
          movimiento={detailTarget}
          puedeEditar={puedeEditar}
          onClose={() => setDetailTarget(null)}
          onVerComprobante={(comprobanteId) => setViewingReceipt({ movimientoId: detailTarget.id, comprobanteId })}
          onEdit={(m) => {
            setDetailTarget(null);
            setEditTarget(m);
          }}
          onDelete={(m) => {
            setDetailTarget(null);
            setConfirmDeleteTarget(m);
          }}
        />
      )}

      {viewingReceipt && (
        <ReceiptViewerDialog
          movimientoId={viewingReceipt.movimientoId}
          comprobanteId={viewingReceipt.comprobanteId}
          onClose={() => setViewingReceipt(null)}
          onUnauthorized={handleUnauthorized}
        />
      )}

      {confirmDeleteTarget && (
        <ConfirmDialog
          title="Eliminar movimiento"
          message={`¿Eliminar "${confirmDeleteTarget.concepto}"? Esta acción no se puede deshacer desde la app.`}
          confirmLabel="Eliminar"
          onClose={() => setConfirmDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {confirmDeleteAvisoTarget && (
        <ConfirmDialog
          title="Eliminar aviso"
          message="¿Eliminar este aviso? Esta acción no se puede deshacer desde la app."
          confirmLabel="Eliminar"
          onClose={() => setConfirmDeleteAvisoTarget(null)}
          onConfirm={handleConfirmDeleteAviso}
        />
      )}

      {showInformes && movimientos !== null && (
        <div className="dialog-overlay" onClick={() => setShowInformes(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Informes</h2>
            <Totals movimientos={movimientos} />
            <div className="dialog-actions">
              <button type="button" className="btn-plain" onClick={() => setShowInformes(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
