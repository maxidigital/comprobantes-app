import { useEffect, useRef, useState } from 'react';
import { BIENES, bienColor } from './bienes';
import { MegaphoneIcon } from './icons';
import type { FiltroTipo } from './types';

interface Props {
  filtroTipo: FiltroTipo;
  onFiltroTipoChange: (tipo: FiltroTipo) => void;
  soloPendientes: boolean;
  onSoloPendientesChange: (value: boolean) => void;
  bienesSeleccionados: Set<string>;
  onToggleBien: (bien: string) => void;
  mostrarAvisos: boolean;
  onToggleAvisos: () => void;
  pendientesCount: number;
}

export default function FilterBar({
  filtroTipo,
  onFiltroTipoChange,
  soloPendientes,
  onSoloPendientesChange,
  bienesSeleccionados,
  onToggleBien,
  mostrarAvisos,
  onToggleAvisos,
  pendientesCount,
}: Props) {
  const [showFiltros, setShowFiltros] = useState(false);
  const filtrosRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="filter-bar">
      <div className="segmented">
        <button
          type="button"
          className={filtroTipo === 'INGRESO' ? 'active' : ''}
          onClick={() => onFiltroTipoChange(filtroTipo === 'INGRESO' ? 'TODOS' : 'INGRESO')}
          aria-pressed={filtroTipo === 'INGRESO'}
        >
          Ingresos
        </button>
        <button
          type="button"
          className={filtroTipo === 'GASTO' ? 'active' : ''}
          onClick={() => onFiltroTipoChange(filtroTipo === 'GASTO' ? 'TODOS' : 'GASTO')}
          aria-pressed={filtroTipo === 'GASTO'}
        >
          Egresos
        </button>
      </div>
      <div className="dropdown-wrapper" ref={filtrosRef}>
        <button
          type="button"
          className={`chip chip-toggle ${soloPendientes || bienesSeleccionados.size > 0 ? 'active' : ''}`}
          onClick={() => setShowFiltros((v) => !v)}
          aria-expanded={showFiltros}
        >
          Filtros
        </button>
        {showFiltros && (
          <div className="dropdown-panel dropdown-panel--centered">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={soloPendientes}
                onChange={(e) => onSoloPendientesChange(e.target.checked)}
              />
              Con comprobante pendiente{pendientesCount > 0 ? ` (${pendientesCount})` : ''}
            </label>

            <div className="dropdown-panel-separator" />

            {BIENES.map((bien) => (
              <label className="checkbox-row" key={bien}>
                <input type="checkbox" checked={bienesSeleccionados.has(bien)} onChange={() => onToggleBien(bien)} />
                <span className="bien-label" style={{ color: bienColor(bien) }}>
                  {bien}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        className={`chip chip-toggle chip-icon ${!mostrarAvisos ? 'active' : ''}`}
        onClick={onToggleAvisos}
        aria-pressed={!mostrarAvisos}
        aria-label={mostrarAvisos ? 'Ocultar avisos' : 'Mostrar avisos'}
        title={mostrarAvisos ? 'Ocultar avisos' : 'Mostrar avisos'}
      >
        <MegaphoneIcon />
      </button>
    </div>
  );
}
