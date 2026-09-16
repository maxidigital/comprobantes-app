import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { agregarComprobantes, ApiError, borrarComprobante, crearMovimiento, editarMovimiento } from './api';
import { BIENES } from './bienes';
import { dateToDisplay, fechaToIso, formatFechaInput, isoToDisplay, todayDisplay } from './fecha';
import type { Comprobante, Movimiento, TipoMovimiento } from './types';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  onClose: () => void;
  onSaved: (movimiento: Movimiento) => void;
  onUnauthorized: () => void;
  editing?: Movimiento;
}

/**
 * Sanitiza el campo mientras se tipea: solo dígitos y, como mucho, UN
 * separador decimal (el primer "," o "." que aparece — cualquier otro
 * separador que venga después, sea coma o punto, se ignora). Así nunca
 * pueden convivir coma y punto en el mismo valor, no hace falta adivinar si
 * es separador de miles o decimal, y no importa qué tecla muestre el
 * teclado numérico del celular.
 */
function formatMontoInput(raw: string): string {
  let parteEntera = '';
  let parteDecimal = '';
  let vioSeparador = false;

  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      if (vioSeparador) {
        if (parteDecimal.length < 2) parteDecimal += ch;
      } else {
        parteEntera += ch;
      }
    } else if ((ch === ',' || ch === '.') && !vioSeparador) {
      vioSeparador = true;
    }
  }

  return vioSeparador ? `${parteEntera}.${parteDecimal}` : parteEntera;
}

/** El campo ya llega saneado por formatMontoInput, así que solo hace falta convertirlo. */
function parseMonto(raw: string): number {
  const limpio = raw.trim();
  return limpio ? Number(limpio) : NaN;
}

export default function MovimientoForm({ onClose, onSaved, onUnauthorized, editing }: Props) {
  useEscapeKey(onClose);

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Acumula lo elegido (no lo reemplaza) y limpia el input, para poder abrir
   * el selector varias veces y sumar comprobantes de a poco en la misma ventana. */
  function handleAgregarArchivos(e: ChangeEvent<HTMLInputElement>) {
    const elegidos = Array.from(e.target.files ?? []);
    if (elegidos.length > 0) {
      setComprobantesNuevos((prev) => [...prev, ...elegidos]);
    }
    e.target.value = '';
  }

  function handleQuitarArchivoNuevo(index: number) {
    setComprobantesNuevos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleBorrarComprobante(comprobanteId: string) {
    if (!editing) return;
    if (!window.confirm('¿Borrar este comprobante?')) return;

    setBorrandoId(comprobanteId);
    setError(null);
    try {
      const actualizado = await borrarComprobante(editing.id, comprobanteId);
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
    if (!bien) nuevosErrores.bien = 'Elegí un bien';

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
        bien: bien.trim(),
        notas: notas.trim(),
        comprobantes: comprobantesNuevos,
      };
      let guardado = editing ? await editarMovimiento(editing.id, datos) : await crearMovimiento(datos);
      if (editing && comprobantesNuevos.length > 0) {
        guardado = await agregarComprobantes(editing.id, comprobantesNuevos);
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
          <textarea id="notas" className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="comprobante">
            {editing ? 'Agregar comprobantes (opcional)' : 'Comprobantes (foto o PDF, opcional)'}
          </label>

          {comprobantesActuales.length > 0 && (
            <ul className="receipt-list">
              {comprobantesActuales.map((c) => (
                <li key={c.id} className="receipt-list-item">
                  <span className="receipt-list-name">{c.nombre}</span>
                  <button
                    type="button"
                    className="btn-plain"
                    onClick={() => handleBorrarComprobante(c.id)}
                    disabled={borrandoId === c.id}
                    style={{ color: 'var(--danger)' }}
                  >
                    {borrandoId === c.id ? 'Borrando…' : 'Borrar'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {comprobantesNuevos.length > 0 && (
            <ul className="receipt-list">
              {comprobantesNuevos.map((file, i) => (
                <li key={`${file.name}-${i}`} className="receipt-list-item">
                  <span className="receipt-list-name">{file.name}</span>
                  <button
                    type="button"
                    className="btn-plain"
                    onClick={() => handleQuitarArchivoNuevo(i)}
                    style={{ color: 'var(--danger)' }}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}

          <input
            ref={fileInputRef}
            id="comprobante"
            className="input"
            type="file"
            accept="image/*,.pdf"
            multiple
            style={{ display: 'none' }}
            onChange={handleAgregarArchivos}
          />
          <button type="button" className="btn-plain" onClick={() => fileInputRef.current?.click()}>
            + Agregar comprobante
          </button>
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
