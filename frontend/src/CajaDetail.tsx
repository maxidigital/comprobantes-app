import type { CajaConfig } from './cajas';
import { currency, formatFecha } from './format';
import type { MovimientoCaja } from './types';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  caja: CajaConfig;
  item: MovimientoCaja;
  puedeEditar: boolean;
  onClose: () => void;
  onEdit: (item: MovimientoCaja) => void;
  onDelete: (item: MovimientoCaja) => void;
}

/** Detalle de solo lectura de una caja simple (Aportes) — mismo formato que MovimientoDetail, sin bien ni comprobantes. */
export default function CajaDetail({ caja, item: m, puedeEditar, onClose, onEdit, onDelete }: Props) {
  useEscapeKey(onClose);
  const montoMoneda = new Intl.NumberFormat('es-AR', { style: 'currency', currency: caja.moneda });

  return (
    <div className="dialog-overlay dialog-overlay--fullscreen" onClick={onClose}>
      <div className="dialog dialog--fullscreen" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-scroll">
          <div className="dialog-header">
            <h2>Detalle · {caja.titulo}</h2>
            <button type="button" className="btn-plain menu-icon-btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>

          <p className={`tipo-badge ${m.tipo === 'INGRESO' ? 'tipo-badge--ingreso' : 'tipo-badge--gasto'}`}>
            {m.tipo === 'INGRESO' ? caja.etiquetasTipo.ingreso : caja.etiquetasTipo.gasto}
          </p>

          <div className="field">
            <label>Fecha</label>
            <p className="detail-value">{formatFecha(m.fecha)}</p>
          </div>

          <div className="field">
            <label>Concepto</label>
            <p className="detail-value">{m.concepto}</p>
          </div>

          {caja.conAportante && (
            <div className="field">
              <label>Aportante</label>
              <p className="detail-value">{m.aportante || '—'}</p>
            </div>
          )}

          <div className="field">
            <label>Monto</label>
            <p className={`detail-value monto ${m.tipo === 'INGRESO' ? 'ingreso' : 'gasto'}`}>
              {m.tipo === 'INGRESO' ? '+' : '-'}
              {montoMoneda.format(m.monto)}
            </p>
          </div>

          {caja.moneda === 'USD' && (
            <div className="field">
              <label>Cotización</label>
              <p className="detail-value">
                {m.cotizacion
                  ? `${currency.format(m.cotizacion)} por dólar = ${currency.format(m.montoArs ?? m.monto * m.cotizacion)}`
                  : '—'}
              </p>
            </div>
          )}

          <div className="field">
            <label>Notas</label>
            <p className="detail-value">{m.notas || '—'}</p>
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
