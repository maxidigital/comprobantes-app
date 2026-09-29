import { useEffect, useRef, useState } from 'react';
import { MenuIcon, MoonIcon, RefreshIcon, SunIcon } from './icons';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

/** Solo lo que es de toda la app — Informes y la IA son de cada caja y están en su FilterBar. */
export default function HeaderMenu({ isDark, onToggleTheme, onRefresh, onLogout }: Props) {
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
        <MenuIcon />
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
              onToggleTheme();
              setOpen(false);
            }}
          >
            {isDark ? <SunIcon /> : <MoonIcon />} {isDark ? 'Modo claro' : 'Modo oscuro'}
          </button>

          <div className="dropdown-panel-separator" />

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
