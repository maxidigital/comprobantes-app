import { useEffect, useRef, useState } from 'react';

interface Props {
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export default function HeaderMenu({ isDark, onToggleTheme, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="header-menu-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="btn-plain"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú"
        aria-expanded={open}
      >
        ☰
      </button>

      {open && (
        <div className="header-menu">
          <button
            type="button"
            onClick={() => {
              onToggleTheme();
              setOpen(false);
            }}
          >
            {isDark ? '☀️ Modo claro' : '🌙 Modo oscuro'}
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
