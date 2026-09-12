import { useEffect, useState } from 'react';
import AccessGate from './AccessGate';
import AttachReceiptDialog from './AttachReceiptDialog';
import ConfirmDialog from './ConfirmDialog';
import MovimientoForm from './MovimientoForm';
import MovimientosList from './MovimientosList';
import Totals from './Totals';
import { ApiError, clearAccessKey, eliminarMovimiento, getAccessKey, listMovimientos } from './api';
import type { Movimiento } from './types';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' ? 'light' : 'dark';
}

export default function App() {
  const [unlocked, setUnlocked] = useState(!!getAccessKey());
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(getInitialTheme());

  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<Movimiento | null>(null);
  const [attachTarget, setAttachTarget] = useState<Movimiento | null>(null);

  useEffect(() => {
    if (unlocked) {
      refreshList();
    }
  }, [unlocked]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('comprobantes.theme', theme);
  }, [theme]);

  async function refreshList() {
    setLoadError(null);
    try {
      const data = await listMovimientos();
      setMovimientos(data);
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
    setShowForm(false);
    setConfirmDeleteTarget(null);
    setAttachTarget(null);
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

  if (!unlocked) {
    return <AccessGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1>Comprobantes</h1>
          <div className="subtitle">Sucesión</div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn-plain"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button type="button" className="btn-plain" onClick={handleUnauthorized}>
            Salir
          </button>
        </div>
      </header>

      <main className="content">
        {movimientos === null && !loadError && <p className="empty-state">Cargando…</p>}
        {loadError && <p className="error-text">{loadError}</p>}

        {movimientos !== null && (
          <>
            <Totals movimientos={movimientos} />
            <MovimientosList
              movimientos={movimientos}
              onRequestDelete={(m) => setConfirmDeleteTarget(m)}
              onRequestAttach={(m) => setAttachTarget(m)}
            />
          </>
        )}
      </main>

      <button className="fab" onClick={() => setShowForm(true)} aria-label="Nuevo movimiento">
        +
      </button>

      {showForm && (
        <MovimientoForm
          onClose={() => setShowForm(false)}
          onCreated={(m) => {
            setMovimientos((prev) => (prev ? [m, ...prev] : [m]));
            setShowForm(false);
          }}
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

      {attachTarget && (
        <AttachReceiptDialog
          movimiento={attachTarget}
          onClose={() => setAttachTarget(null)}
          onAttached={(actualizado) => {
            setMovimientos((prev) => (prev ? prev.map((m) => (m.id === actualizado.id ? actualizado : m)) : prev));
            setAttachTarget(null);
          }}
          onUnauthorized={handleUnauthorized}
        />
      )}
    </div>
  );
}
