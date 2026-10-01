import type { FiltroTipo } from './types';

interface Props {
  filtroTipo: FiltroTipo;
  onChange: (tipo: FiltroTipo) => void;
}

/** Filtro Ingresos/Egresos: uno solo para toda la app (se mantiene al cambiar de caja), al lado del desplegable de cajas. */
export default function TipoToggle({ filtroTipo, onChange }: Props) {
  return (
    <div className="segmented">
      <button
        type="button"
        className={filtroTipo === 'INGRESO' ? 'active' : ''}
        onClick={() => onChange(filtroTipo === 'INGRESO' ? 'TODOS' : 'INGRESO')}
        aria-pressed={filtroTipo === 'INGRESO'}
      >
        Ingresos
      </button>
      <button
        type="button"
        className={filtroTipo === 'GASTO' ? 'active' : ''}
        onClick={() => onChange(filtroTipo === 'GASTO' ? 'TODOS' : 'GASTO')}
        aria-pressed={filtroTipo === 'GASTO'}
      >
        Egresos
      </button>
    </div>
  );
}
