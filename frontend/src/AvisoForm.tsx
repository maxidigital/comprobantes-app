import { FormEvent, useState } from 'react';
import { ApiError, crearAviso } from './api';
import { BIENES } from './bienes';
import { fechaToIso, formatFechaInput, todayDisplay } from './fecha';
import type { Aviso } from './types';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  onClose: () => void;
  onSaved: (aviso: Aviso) => void;
  onUnauthorized: () => void;
}

export default function AvisoForm({ onClose, onSaved, onUnauthorized }: Props) {
  useEscapeKey(onClose);

  const [fechaTexto, setFechaTexto] = useState(todayDisplay());
  const [bien, setBien] = useState('');
  const [texto, setTexto] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ fecha?: string; bien?: string; texto?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const fechaIso = fechaToIso(fechaTexto);

    const nuevosErrores: typeof fieldErrors = {};
    if (!fechaIso) nuevosErrores.fecha = 'Fecha inválida (dd/mm/aaaa)';
    if (!bien) nuevosErrores.bien = 'Elegí un bien';
    if (!texto.trim()) nuevosErrores.texto = 'Escribí el aviso';

    if (Object.keys(nuevosErrores).length > 0 || !fechaIso) {
      setFieldErrors(nuevosErrores);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    setError(null);
    try {
      const guardado = await crearAviso({ fecha: fechaIso, bien, texto: texto.trim() });
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
            <h2>Nuevo aviso</h2>
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

          <div className="field">
            <label htmlFor="aviso-texto">Aviso</label>
            <textarea id="aviso-texto" className="input" value={texto} onChange={(e) => setTexto(e.target.value)} />
            {fieldErrors.texto && <p className="error-text">{fieldErrors.texto}</p>}
          </div>

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
