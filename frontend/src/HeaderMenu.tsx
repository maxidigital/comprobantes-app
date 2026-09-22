import { useEffect, useRef, useState } from 'react';
import { ChartIcon, MoonIcon, RefreshIcon, SunIcon } from './icons';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  onRefresh: () => void;
  onInformes: () => void;
  onLogout: () => void;
}

export default function HeaderMenu({ isDark, onToggleTheme, onRefresh, onInformes, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEscapeKey(() => setOpen(false));

  useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div className="dropdown-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="btn-plain menu-icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú"
        aria-expanded={open}
      >
        ☰
      </button>

      {open && (
        <div className="dropdown-panel">
          <button
            type="button"
            onClick={() => {
              onRefresh();
              setOpen(false);
            }}
          >
            <RefreshIcon /> Actualizar desde planilla
          </button>
          <button
            type="button"
            onClick={() => {
              onInformes();
              setOpen(false);
            }}
          >
            <ChartIcon /> Informes
          </button>
          <button
            type="button"
            onClick={() => {
              onToggleTheme();
              setOpen(false);
            }}
          >
            {isDark ? <SunIcon /> : <MoonIcon />} {isDark ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <button
            type="button"
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
          >
            Salir
          </button>
        </div>
      )}
    </div>
  );
}
