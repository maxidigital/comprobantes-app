import { bienColor } from './bienes';
import { currency, formatFecha } from './format';
import type { Movimiento } from './types';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  movimiento: Movimiento;
  puedeEditar: boolean;
  onClose: () => void;
  onVerComprobante: (comprobanteId: string) => void;
  onEdit: (movimiento: Movimiento) => void;
  onDelete: (movimiento: Movimiento) => void;
}

export default function MovimientoDetail({
  movimiento: m,
  puedeEditar,
  onClose,
  onVerComprobante,
  onEdit,
  onDelete,
}: Props) {
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

        <p className={`tipo-badge ${m.tipo === 'INGRESO' ? 'tipo-badge--ingreso' : 'tipo-badge--gasto'}`}>
          {m.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
        </p>

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
          <p className="detail-value" style={m.bien ? { color: bienColor(m.bien) } : undefined}>
            {m.bien || '—'}
          </p>
        </div>

        <div className="field">
          <label>Monto</label>
          <p className={`detail-value monto ${m.tipo === 'INGRESO' ? 'ingreso' : 'gasto'}`}>
            {m.tipo === 'INGRESO' ? '+' : '-'}
            {currency.format(m.monto)}
          </p>
        </div>

        <div className="field">
          <label>Notas</label>
          <p className="detail-value">{m.notas || '—'}</p>
        </div>

        <div className="field">
          {m.comprobantePendiente ? (
            <p className="detail-value">
              <span className="badge-pending badge-pending--text">Pendiente</span>
            </p>
          ) : (
            <div className="chip-list">
              {m.comprobantes.map((c, i) => (
                <button key={c.id} type="button" className="chip" onClick={() => onVerComprobante(c.id)}>
                  {m.comprobantes.length > 1 ? `Ver comprobante ${i + 1}` : 'Ver comprobante'}
                </button>
              ))}
            </div>
          )}
        </div>

        {m.cargadoPor && (
          <p className="cargado-por">
            Cargado por <span className="cargado-por-nombre">{m.cargadoPor}</span>
          </p>
        )}
        </div>

        <div className="dialog-actions">
          {puedeEditar && (
            <>
              <button
                type="button"
                className="btn-plain"
                style={{ color: 'var(--danger)' }}
                onClick={() => onDelete(m)}
              >
                Eliminar
              </button>
              <button type="button" className="btn-plain" onClick={() => onEdit(m)}>
                Editar
              </button>
            </>
          )}
          <button type="button" className="btn-plain" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
