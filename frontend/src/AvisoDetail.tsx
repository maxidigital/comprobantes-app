import { bienColor } from './bienes';
import { formatFecha } from './format';
import type { Aviso } from './types';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  aviso: Aviso;
  /** Solo Alquileres tiene bien. */
  conBien: boolean;
  puedeEditar: boolean;
  onClose: () => void;
  onVerComprobante: (comprobanteId: string) => void;
  onEdit: (aviso: Aviso) => void;
  onDelete: (aviso: Aviso) => void;
}

/** Detalle de solo lectura de un aviso (como MovimientoDetail): texto, fecha, bien y un chip "Ver" por comprobante. */
export default function AvisoDetail({ aviso: a, conBien, puedeEditar, onClose, onVerComprobante, onEdit, onDelete }: Props) {
  useEscapeKey(onClose);

  return (
    <div className="dialog-overlay dialog-overlay--fullscreen" onClick={onClose}>
      <div className="dialog dialog--fullscreen" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-scroll">
          <div className="dialog-header">
            <h2>Aviso</h2>
            <button type="button" className="btn-plain menu-icon-btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>

          <div className="field">
            <label>Fecha</label>
            <p className="detail-value">{formatFecha(a.fecha)}</p>
          </div>

          {conBien && (
            <div className="field">
              <label>Bien relacionado</label>
              <p className="detail-value" style={a.bien ? { color: bienColor(a.bien) } : undefined}>
                {a.bien || '—'}
              </p>
            </div>
          )}

          <div className="field">
            <label>Aviso</label>
            <p className="detail-value detail-value--texto">{a.texto}</p>
          </div>

          {a.comprobantes.length > 0 && (
            <div className="field">
              <div className="chip-list">
                {a.comprobantes.map((c, i) => (
                  <button key={c.id} type="button" className="chip" onClick={() => onVerComprobante(c.id)}>
                    {a.comprobantes.length > 1 ? `Ver comprobante ${i + 1}` : 'Ver comprobante'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {a.autor && (
            <p className="cargado-por">
              Cargado por <span className="cargado-por-nombre">{a.autor}</span>
            </p>
          )}
        </div>

        <div className="dialog-actions">
          {puedeEditar && (
            <>
              <button type="button" className="btn-plain" style={{ color: 'var(--danger)' }} onClick={() => onDelete(a)}>
                Eliminar
              </button>
              <button type="button" className="btn-plain" onClick={() => onEdit(a)}>
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
