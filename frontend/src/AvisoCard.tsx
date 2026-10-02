import { bienColor } from './bienes';
import { formatFecha } from './format';
import type { Aviso } from './types';
import type { useSwipeRows } from './useSwipeRows';

interface Props {
  aviso: Aviso;
  puedeEditar: boolean;
  /** Las props de swipe de la tarjeta (useSwipeRows#cardProps), ya aplicadas a este aviso. */
  swipeProps: ReturnType<ReturnType<typeof useSwipeRows>['cardProps']>;
  onDelete: () => void;
}

/** Un aviso en la lista de una caja (glow amarillo, sin monto). Compartido por MovimientosList y CajaView. */
export default function AvisoCard({ aviso: a, puedeEditar, swipeProps, onDelete }: Props) {
  return (
    <div className="swipe-row">
      {puedeEditar && (
        <div className="swipe-actions">
          <button type="button" className="swipe-action swipe-action--delete" onClick={onDelete}>
            Eliminar
          </button>
        </div>
      )}

      <div className="card movement-card movement-card--aviso" {...swipeProps}>
        <div className="row-top">
          <span className="concepto">{a.texto}</span>
        </div>
        <div className="row-bottom">
          <span className="meta">
            {formatFecha(a.fecha)}
            {a.autor ? ` · ${a.autor}` : ''}
          </span>
          {a.bien && (
            <span className="bien-label" style={{ color: bienColor(a.bien) }}>
              {a.bien}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
