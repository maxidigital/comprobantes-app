import { currency, formatFecha } from './format';
import type { Movimiento } from './types';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  movimiento: Movimiento;
  onClose: () => void;
  onVerComprobante: () => void;
}

export default function MovimientoDetail({ movimiento: m, onClose, onVerComprobante }: Props) {
  useEscapeKey(onClose);

  return (
    <div className="dialog-overlay dialog-overlay--fullscreen" onClick={onClose}>
      <div className="dialog dialog--fullscreen" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-scroll">
        <div className="dialog-header">
          <h2>Detalle del movimiento</h2>
          <button type="button" className="btn-plain menu-icon-btn" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="field">
          <label>Tipo</label>
          <p className="detail-value">{m.tipo === 'INGRESO' ? 'Ingreso' : 'Gasto'}</p>
        </div>

        <div className="field">
          <label>Fecha</label>
          <p className="detail-value">{formatFecha(m.fecha)}</p>
        </div>

        <div className="field">
          <label>Concepto</label>
          <p className="detail-value">{m.concepto}</p>
        </div>

        <div className="field">
          <label>Bien relacionado</label>
          <p className="detail-value">{m.bien || '—'}</p>
        </div>

        <div className="field">
          <label>Monto</label>
          <p className={`detail-value monto ${m.tipo === 'INGRESO' ? 'ingreso' : ''}`}>
            {m.tipo === 'INGRESO' ? '+' : '-'}
            {currency.format(m.monto)}
          </p>
        </div>

        <div className="field">
          <label>Notas</label>
          <p className="detail-value">{m.notas || '—'}</p>
        </div>

        <div className="field">
          <label>Comprobante</label>
          <p className="detail-value">
            {m.comprobantePendiente ? (
              <span className="badge-pending badge-pending--text">Pendiente</span>
            ) : (
              <button type="button" className="chip" onClick={onVerComprobante}>
                Ver comprobante
              </button>
            )}
          </p>
        </div>

        <div className="field">
          <label>Cargado por</label>
          <p className="detail-value">{m.cargadoPor || '—'}</p>
        </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn-plain" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
