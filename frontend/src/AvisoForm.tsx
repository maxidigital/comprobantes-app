import { FormEvent, useState } from 'react';
import { agregarComprobantesAviso, ApiError, borrarComprobanteAviso, crearAviso, editarAviso } from './api';
import { BIENES } from './bienes';
import { tieneBien } from './cajas';
import ComprobantesField from './ComprobantesField';
import { fechaToIso, formatFechaInput, isoToDisplay, todayDisplay } from './fecha';
import type { Aviso, CajaId, CajaMovimientos, Comprobante } from './types';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  caja: CajaMovimientos | CajaId;
  /** Si viene, el formulario edita ese aviso (el autor no cambia). */
  editing?: Aviso;
  onClose: () => void;
  onSaved: (aviso: Aviso) => void;
  onUnauthorized: () => void;
}

export default function AvisoForm({ caja, editing, onClose, onSaved, onUnauthorized }: Props) {
  useEscapeKey(onClose);

  const conBien = tieneBien(caja);
  const [fechaTexto, setFechaTexto] = useState(editing ? isoToDisplay(editing.fecha) : todayDisplay());
  const [bien, setBien] = useState(editing?.bien ?? '');
  const [texto, setTexto] = useState(editing?.texto ?? '');
  const [comprobantesActuales, setComprobantesActuales] = useState<Comprobante[]>(editing?.comprobantes ?? []);
  const [comprobantesNuevos, setComprobantesNuevos] = useState<File[]>([]);
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ fecha?: string; bien?: string; texto?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleBorrarComprobante(comprobanteId: string) {
    if (!editing) return;
    if (!window.confirm('¿Borrar este comprobante?')) return;

    setBorrandoId(comprobanteId);
    setError(null);
    try {
      const actualizado = await borrarComprobanteAviso(caja, editing.id, comprobanteId);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const fechaIso = fechaToIso(fechaTexto);

    const nuevosErrores: typeof fieldErrors = {};
    if (!fechaIso) nuevosErrores.fecha = 'Fecha inválida (dd/mm/aaaa)';
    if (conBien && !bien) nuevosErrores.bien = 'Elegí un bien';
    if (!texto.trim()) nuevosErrores.texto = 'Escribí el aviso';

    if (Object.keys(nuevosErrores).length > 0 || !fechaIso) {
      setFieldErrors(nuevosErrores);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    setError(null);
    try {
      const datos = { fecha: fechaIso, bien: conBien ? bien : '', texto: texto.trim(), comprobantes: comprobantesNuevos };
      let guardado = editing ? await editarAviso(caja, editing.id, datos) : await crearAviso(caja, datos);
      if (editing && comprobantesNuevos.length > 0) {
        guardado = await agregarComprobantesAviso(caja, editing.id, comprobantesNuevos);
      }
      onSaved(guardado);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : 'No se pudo guardar el aviso');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-overlay dialog-overlay--fullscreen" onClick={onClose}>
      <form className="dialog dialog--fullscreen" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="dialog-scroll">
          <div className="dialog-header">
            <h2>{editing ? 'Editar aviso' : 'Nuevo aviso'}</h2>
            <button type="button" className="btn-plain menu-icon-btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>

          <div className="field">
            <label htmlFor="aviso-fecha">Fecha</label>
            <input
              id="aviso-fecha"
              className="input"
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              maxLength={10}
              value={fechaTexto}
              onChange={(e) => setFechaTexto(formatFechaInput(e.target.value))}
            />
            {fieldErrors.fecha && <p className="error-text">{fieldErrors.fecha}</p>}
          </div>

          {conBien && (
            <div className="field">
              <label htmlFor="aviso-bien">Bien relacionado</label>
              <select id="aviso-bien" className="input" value={bien} onChange={(e) => setBien(e.target.value)}>
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
            <label htmlFor="aviso-texto">Aviso</label>
            <textarea id="aviso-texto" className="input" value={texto} onChange={(e) => setTexto(e.target.value)} />
            {fieldErrors.texto && <p className="error-text">{fieldErrors.texto}</p>}
          </div>

          <ComprobantesField
            id="aviso-comprobante"
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
