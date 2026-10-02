import { FormEvent, useState } from 'react';
import { agregarComprobantes, ApiError, borrarComprobante, crearMovimiento, editarMovimiento } from './api';
import { BIENES } from './bienes';
import ComprobantesField from './ComprobantesField';
import { tieneBien } from './cajas';
import { dateToDisplay, fechaToIso, formatFechaInput, isoToDisplay, todayDisplay } from './fecha';
import { formatMontoInput, parseMonto } from './monto';
import { NotasEditor } from './Notas';
import type { CajaMovimientos, Comprobante, Movimiento, TipoMovimiento } from './types';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  caja: CajaMovimientos;
  onClose: () => void;
  onSaved: (movimiento: Movimiento) => void;
  onUnauthorized: () => void;
  editing?: Movimiento;
}

export default function MovimientoForm({ caja, onClose, onSaved, onUnauthorized, editing }: Props) {
  useEscapeKey(onClose);
  const conBien = tieneBien(caja);

  const [tipo, setTipo] = useState<TipoMovimiento>(editing?.tipo ?? 'GASTO');
  const [fechaTexto, setFechaTexto] = useState(editing ? isoToDisplay(editing.fecha) : todayDisplay());
  const [monto, setMonto] = useState(editing ? String(editing.monto) : '');
  const [concepto, setConcepto] = useState(editing?.concepto ?? '');
  const [bien, setBien] = useState(editing?.bien ?? '');
  const [notas, setNotas] = useState(editing?.notas ?? '');
  const [comprobantesActuales, setComprobantesActuales] = useState<Comprobante[]>(editing?.comprobantes ?? []);
  const [comprobantesNuevos, setComprobantesNuevos] = useState<File[]>([]);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ fecha?: string; concepto?: string; monto?: string; bien?: string }>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleBorrarComprobante(comprobanteId: string) {
    if (!editing) return;
    if (!window.confirm('¿Borrar este comprobante?')) return;

    setBorrandoId(comprobanteId);
    setError(null);
    try {
      const actualizado = await borrarComprobante(caja, editing.id, comprobanteId);
      setComprobantesActuales(actualizado.comprobantes);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : 'No se pudo borrar el comprobante');
    } finally {
      setBorrandoId(null);
    }
  }

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
    if (conBien && !bien) nuevosErrores.bien = 'Elegí un bien';

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
        bien: conBien ? bien.trim() : '',
        notas: notas.trim(),
        comprobantes: comprobantesNuevos,
      };
      let guardado = editing ? await editarMovimiento(caja, editing.id, datos) : await crearMovimiento(caja, datos);
      if (editing && comprobantesNuevos.length > 0) {
        guardado = await agregarComprobantes(caja, editing.id, comprobantesNuevos);
      }
      onSaved(guardado);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : 'No se pudo guardar el movimiento');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-overlay dialog-overlay--fullscreen" onClick={onClose}>
      <form className="dialog dialog--fullscreen" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="dialog-scroll">
        <div className="dialog-header">
          <h2>{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</h2>
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
            Ingreso
          </button>
          <button type="button" className={tipo === 'GASTO' ? 'active-gasto' : ''} onClick={() => setTipo('GASTO')}>
            Egreso
          </button>
        </div>

        <div className="field">
          <label htmlFor="fecha">Fecha</label>
          <div className="fecha-stepper">
            <button
              type="button"
              className="fecha-step-btn"
              onClick={() => shiftFecha(-1)}
              aria-label="Día anterior"
            >
              ‹
            </button>
            <input
              id="fecha"
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
          <label htmlFor="concepto">Concepto</label>
          <input
            id="concepto"
            className="input"
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej TGI o Expensas"
          />
          {fieldErrors.concepto && <p className="error-text">{fieldErrors.concepto}</p>}
        </div>

        {conBien && (
          <div className="field">
            <label htmlFor="bien">Bien relacionado</label>
            <select id="bien" className="input" value={bien} onChange={(e) => setBien(e.target.value)}>
              <option value="" disabled>
                Elegir bien
              </option>
              {BIENES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {fieldErrors.bien && <p className="error-text">{fieldErrors.bien}</p>}
          </div>
        )}

        <div className="field">
          <label htmlFor="monto">Monto</label>
          <div className="input-prefix-wrap">
            <span className="input-prefix">$</span>
            <input
              id="monto"
              className="input input-with-prefix"
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
          <label htmlFor="notas">Notas (opcional)</label>
          <NotasEditor id="notas" value={notas} onChange={setNotas} />
        </div>

        <ComprobantesField
          id="comprobante"
          actuales={comprobantesActuales}
          nuevos={comprobantesNuevos}
          onNuevosChange={setComprobantesNuevos}
          onBorrar={handleBorrarComprobante}
          borrandoId={borrandoId}
          editando={!!editing}
        />

        {error && <p className="error-text">{error}</p>}
        </div>

        <div className="dialog-actions">
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
