import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import AccessGate from './AccessGate';
import AvisoForm from './AvisoForm';
import { BIENES, bienColor } from './bienes';
import { borrarCaches, guardarCache, leerCache } from './cache';
import { CAJAS, esCajaMovimientos, tieneBien, VISTAS, type Vista } from './cajas';
import CajaView from './CajaView';
import ConfirmDialog from './ConfirmDialog';
import FilterBar from './FilterBar';
import HeaderMenu from './HeaderMenu';
import MovimientoDetail from './MovimientoDetail';
import MovimientoForm from './MovimientoForm';
import MovimientosList from './MovimientosList';
import ReceiptViewerDialog from './ReceiptViewerDialog';
import TipoToggle from './TipoToggle';
import Totals from './Totals';
import {
  ApiError,
  clearAccessKey,
  eliminarAviso,
  eliminarMovimiento,
  getAccessKey,
  getUserName,
  getUserRole,
  listAvisos,
  listMovimientos,
  login,
  setUserRole,
} from './api';
import type { Aviso, CajaMovimientos, FiltroAvisos, FiltroTipo, Movimiento, Rol } from './types';
import { useEscapeKey } from './useEscapeKey';
import { useVersionCheck } from './useVersionCheck';

// Carga diferida: el render de Markdown (react-markdown + remark-gfm) casi
// duplica el bundle, y solo hace falta al abrir el chat.
const PreguntaIADialog = lazy(() => import('./PreguntaIADialog'));

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
  const [theme, setTheme] = useState<Theme>(getInitialTheme());
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [bienesSeleccionados, setBienesSeleccionados] = useState<Set<string>>(new Set());
  const [fechaDesde, setFechaDesde] = useState<string | null>(null);
  const [fechaHasta, setFechaHasta] = useState<string | null>(null);
  const [filtroAvisos, setFiltroAvisos] = useState<FiltroAvisos>('TODOS');

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Movimiento | null>(null);
  const [detailTarget, setDetailTarget] = useState<Movimiento | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{
    movimientoId: string;
    comprobanteId: string;
  } | null>(null);
  const [showInformes, setShowInformes] = useState(false);
  const [showPreguntaIA, setShowPreguntaIA] = useState(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<Movimiento | null>(null);
  const [showCrearMenu, setShowCrearMenu] = useState(false);
  const [showAvisoForm, setShowAvisoForm] = useState(false);
  const [confirmDeleteAvisoTarget, setConfirmDeleteAvisoTarget] = useState<Aviso | null>(null);
  const fabMenuRef = useRef<HTMLDivElement>(null);
  // En estado (y no leído directo de localStorage) para poder completarlo
  // después: una sesión iniciada antes de que existieran los roles tiene la
  // contraseña y el nombre guardados pero no el rol (ver el useEffect de abajo).
  const [rol, setRol] = useState<Rol | null>(getUserRole());
  const puedeEditar = rol !== 'VIEWER';
  const [vista, setVista] = useState<Vista>('sucesion');
  const [cajaRefreshKey, setCajaRefreshKey] = useState(0);
  // Las cajas simples (CajaView) ponen su barra de filtros acá, adentro del encabezado fijo.
  const [filterSlot, setFilterSlot] = useState<HTMLDivElement | null>(null);
  // Alquileres, Remodelación Iriondo y Varios comparten toda esta pantalla (lista,
  // filtros, formularios); solo cambia contra qué pestañas habla la API.
  const caja: CajaMovimientos = esCajaMovimientos(vista) ? vista : 'sucesion';
  const cajaCargadaRef = useRef<CajaMovimientos>(caja);

  const pendientesCount = useMemo(
    () => (movimientos ?? []).filter((m) => m.comprobantePendiente).length,
    [movimientos],
  );

  const aniosConDatos = useMemo(() => {
    const anioActual = new Date().getFullYear();
    const anios = new Set<number>([anioActual]);
    for (const m of movimientos ?? []) anios.add(Number(m.fecha.slice(0, 4)));
    for (const a of avisos) anios.add(Number(a.fecha.slice(0, 4)));
    return [...anios].sort((a, b) => a - b);
  }, [movimientos, avisos]);

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
    if (!unlocked || getUserRole()) return;
    login(getUserName() ?? '', getAccessKey() ?? '')
      .then(({ rol: rolResuelto }) => {
        setUserRole(rolResuelto);
        setRol(rolResuelto);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) handleUnauthorized();
      });
  }, [unlocked]);

  useEffect(() => {
    if (unlocked && esCajaMovimientos(vista)) {
      cajaCargadaRef.current = vista;
      // Lo último que se vio de esta caja aparece al instante; refreshList lo
      // reemplaza cuando llega lo fresco de la planilla.
      const cacheada = leerCache<{ movimientos: Movimiento[]; avisos: Aviso[] }>(vista);
      setMovimientos(cacheada?.movimientos ?? null);
      setAvisos(cacheada?.avisos ?? []);
      setBienesSeleccionados(new Set());
      refreshList(vista);
    }
  }, [unlocked, vista]);

  // Cualquier cambio a la lista visible (carga, alta, edición, baja) queda en
  // el caché de la caja que se está viendo.
  useEffect(() => {
    if (movimientos !== null) guardarCache(cajaCargadaRef.current, { movimientos, avisos });
  }, [movimientos, avisos]);

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

  async function refreshList(cajaPedida: CajaMovimientos = caja) {
    setLoadError(null);
    try {
      const [movimientosData, avisosData] = await Promise.all([listMovimientos(cajaPedida), listAvisos(cajaPedida)]);
      // Si se cambió de caja mientras cargaba, esta respuesta ya no corresponde.
      if (cajaCargadaRef.current !== cajaPedida) return;
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

  function handleUnauthorized() {
    clearAccessKey();
    borrarCaches();
    setVista('sucesion');
    setShowForm(false);
    setEditTarget(null);
    setDetailTarget(null);
    setViewingReceipt(null);
    setConfirmDeleteTarget(null);
    setShowCrearMenu(false);
    setShowAvisoForm(false);
    setConfirmDeleteAvisoTarget(null);
    setShowPreguntaIA(false);
    setUnlocked(false);
  }

  async function handleConfirmDelete() {
    if (!confirmDeleteTarget) return;
    try {
      await eliminarMovimiento(caja, confirmDeleteTarget.id);
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
      await eliminarAviso(caja, confirmDeleteAvisoTarget.id);
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
    return (
      <AccessGate
        onUnlock={() => {
          setRol(getUserRole());
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <div className="app-shell" data-caja={vista}>
      <div className="sticky-header">
        <header className="top-bar">
          <div>
            <h1>Administración</h1>
            <div className="subtitle">Sucesión Bottazzi</div>
          </div>
          <div className="top-bar-actions">
            <HeaderMenu
              isDark={theme === 'dark'}
              onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              onRefresh={() => {
                if (esCajaMovimientos(vista)) {
                  refreshList();
                } else {
                  setCajaRefreshKey((k) => k + 1);
                }
              }}
              onLogout={handleUnauthorized}
            />
          </div>
        </header>

        <div className="caja-bar">
          <select
            className="vista-select"
            value={vista}
            onChange={(e) => setVista(e.target.value as Vista)}
            aria-label="Caja"
          >
            {VISTAS.filter((v) => !v.roles || (rol !== null && v.roles.includes(rol))).map((v) => (
              <option key={v.id} value={v.id}>
                {v.titulo}
              </option>
            ))}
          </select>
          <TipoToggle filtroTipo={filtroTipo} onChange={setFiltroTipo} />
        </div>

        <div ref={setFilterSlot} />

        {esCajaMovimientos(vista) && movimientos !== null && (
          <FilterBar
            pendientes={{ solo: soloPendientes, onChange: setSoloPendientes, count: pendientesCount }}
            categorias={
              tieneBien(caja)
                ? { opciones: BIENES, seleccionadas: bienesSeleccionados, onToggle: toggleBien, color: bienColor }
                : undefined
            }
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            onFechaRangeChange={(desde, hasta) => {
              setFechaDesde(desde);
              setFechaHasta(hasta);
            }}
            aniosConDatos={aniosConDatos}
            avisos={{ filtro: filtroAvisos, onChange: setFiltroAvisos }}
            onInformes={() => setShowInformes(true)}
            onPreguntarIA={() => setShowPreguntaIA(true)}
          />
        )}
      </div>

      {!esCajaMovimientos(vista) ? (
        <CajaView
          key={`${vista}-${cajaRefreshKey}`}
          caja={CAJAS[vista]}
          puedeEditar={puedeEditar}
          filtroTipo={filtroTipo}
          filterSlot={filterSlot}
          onUnauthorized={handleUnauthorized}
        />
      ) : (
        <>
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
                filtroAvisos={filtroAvisos}
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
        </>
      )}

      {(showForm || editTarget) && (
        <MovimientoForm
          caja={caja}
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
          caja={caja}
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
          conBien={tieneBien(caja)}
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
          caja={caja}
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

      {showPreguntaIA && (
        <Suspense fallback={null}>
          <PreguntaIADialog
            cajaInicial={caja}
            onClose={() => setShowPreguntaIA(false)}
            onUnauthorized={handleUnauthorized}
          />
        </Suspense>
      )}

      {showInformes && movimientos !== null && (
        <div className="dialog-overlay" onClick={() => setShowInformes(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Informes · {VISTAS.find((v) => v.id === caja)?.titulo}</h2>
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
