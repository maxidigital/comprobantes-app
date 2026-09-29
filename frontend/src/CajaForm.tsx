import { FormEvent, useState } from 'react';
import { ApiError, crearEnCaja, editarEnCaja } from './api';
import { APORTANTES, type CajaConfig } from './cajas';
import { dateToDisplay, fechaToIso, formatFechaInput, isoToDisplay, todayDisplay } from './fecha';
import { formatMontoInput, parseMonto } from './monto';
import type { MovimientoCaja, TipoMovimiento } from './types';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  caja: CajaConfig;
  editing?: MovimientoCaja;
  onClose: () => void;
  onSaved: (item: MovimientoCaja) => void;
  onDelete: (item: MovimientoCaja) => void;
  onUnauthorized: () => void;
}

/** Alta/edición en una de las cajas de ADMIN — mismo formato que MovimientoForm, sin bien ni comprobantes, y con aportante si la caja lo lleva. */
export default function CajaForm({ caja, editing, onClose, onSaved, onDelete, onUnauthorized }: Props) {
  useEscapeKey(onClose);

  const [tipo, setTipo] = useState<TipoMovimiento>(editing?.tipo ?? (caja.conAportante ? 'INGRESO' : 'GASTO'));
  const [fechaTexto, setFechaTexto] = useState(editing ? isoToDisplay(editing.fecha) : todayDisplay());
  const [monto, setMonto] = useState(editing ? String(editing.monto) : '');
  const [concepto, setConcepto] = useState(editing?.concepto ?? '');
  const [aportante, setAportante] = useState(editing?.aportante ?? '');
  const [notas, setNotas] = useState(editing?.notas ?? '');
  const [fieldErrors, setFieldErrors] = useState<{
    fecha?: string;
    concepto?: string;
    monto?: string;
    aportante?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function shiftFecha(dias: number) {
    const iso = fechaToIso(fechaTexto);
    const base = iso ? new Date(`${iso}T00:00:00`) : new Date();
    base.setDate(base.getDate() + dias);
    setFechaTexto(dateToDisplay(base));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const montoNumero = parseMonto(monto);
    const fechaIso = fechaToIso(fechaTexto);

    const nuevosErrores: typeof fieldErrors = {};
    if (!fechaIso) nuevosErrores.fecha = 'Fecha inválida (dd/mm/aaaa)';
    if (!concepto.trim()) nuevosErrores.concepto = 'Completá el concepto';
    if (!montoNumero || montoNumero <= 0) nuevosErrores.monto = 'Ingresá un monto válido';
    if (caja.conAportante && !aportante) nuevosErrores.aportante = 'Elegí quién aporta';

    if (Object.keys(nuevosErrores).length > 0 || !fechaIso) {
      setFieldErrors(nuevosErrores);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    setError(null);
    try {
      const datos = {
        fecha: fechaIso,
        tipo,
        monto: montoNumero,
        concepto: concepto.trim(),
        aportante: caja.conAportante ? aportante : undefined,
        notas: notas.trim(),
      };
      const guardado = editing ? await editarEnCaja(caja.id, editing.id, datos) : await crearEnCaja(caja.id, datos);
      onSaved(guardado);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-overlay dialog-overlay--fullscreen" onClick={onClose}>
      <form className="dialog dialog--fullscreen" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="dialog-scroll">
          <div className="dialog-header">
            <h2>
              {editing ? 'Editar' : 'Nuevo'} · {caja.titulo}
            </h2>
            <button type="button" className="btn-plain menu-icon-btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>

          <div className="type-toggle">
            <button
              type="button"
              className={tipo === 'INGRESO' ? 'active-ingreso' : ''}
              onClick={() => setTipo('INGRESO')}
            >
              {caja.etiquetasTipo.ingreso}
            </button>
            <button type="button" className={tipo === 'GASTO' ? 'active-gasto' : ''} onClick={() => setTipo('GASTO')}>
              {caja.etiquetasTipo.gasto}
            </button>
          </div>

          <div className="field">
            <label htmlFor="caja-fecha">Fecha</label>
            <div className="fecha-stepper">
              <button type="button" className="fecha-step-btn" onClick={() => shiftFecha(-1)} aria-label="Día anterior">
                ‹
              </button>
              <input
                id="caja-fecha"
                className="input"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/aaaa"
                maxLength={10}
                value={fechaTexto}
                onChange={(e) => setFechaTexto(formatFechaInput(e.target.value))}
              />
              <button type="button" className="fecha-step-btn" onClick={() => shiftFecha(1)} aria-label="Día siguiente">
                ›
              </button>
            </div>
            {fieldErrors.fecha && <p className="error-text">{fieldErrors.fecha}</p>}
          </div>

          <div className="field">
            <label htmlFor="caja-concepto">Concepto</label>
            <input
              id="caja-concepto"
              className="input"
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder={caja.conAportante ? 'Ej Transferencia para materiales' : 'Ej Mano de obra albañilería'}
            />
            {fieldErrors.concepto && <p className="error-text">{fieldErrors.concepto}</p>}
          </div>

          {caja.conAportante && (
            <div className="field">
              <label htmlFor="caja-aportante">Aportante</label>
              <select
                id="caja-aportante"
                className="input"
                value={aportante}
                onChange={(e) => setAportante(e.target.value)}
              >
                <option value="" disabled>
                  Elegir aportante
                </option>
                {APORTANTES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              {fieldErrors.aportante && <p className="error-text">{fieldErrors.aportante}</p>}
            </div>
          )}

          <div className="field">
            <label htmlFor="caja-monto">Monto{caja.moneda === 'USD' ? ' en dólares' : ''}</label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">{caja.moneda === 'USD' ? 'US$' : '$'}</span>
              <input
                id="caja-monto"
                className={`input input-with-prefix ${caja.moneda === 'USD' ? 'input-with-prefix--ancho' : ''}`}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(formatMontoInput(e.target.value))}
              />
            </div>
            {fieldErrors.monto && <p className="error-text">{fieldErrors.monto}</p>}
          </div>

          <div className="field">
            <label htmlFor="caja-notas">Notas (opcional)</label>
            <textarea id="caja-notas" className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          {error && <p className="error-text">{error}</p>}
        </div>

        <div className="dialog-actions">
          {editing && (
            <button
              type="button"
              className="btn-plain"
              style={{ color: 'var(--danger)', marginRight: 'auto' }}
              onClick={() => onDelete(editing)}
            >
              Eliminar
            </button>
          )}
          <button type="button" className="btn-plain" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-solid" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
