import { FormEvent, useState } from 'react';
import { ApiError, crearMovimiento, editarMovimiento } from './api';
import type { Movimiento, TipoMovimiento } from './types';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  onClose: () => void;
  onSaved: (movimiento: Movimiento) => void;
  onUnauthorized: () => void;
  editing?: Movimiento;
}

const BIENES = ['General', 'Iriondo', 'San Martín', 'Oficina', '3 de febrero'];

function todayDisplay(): string {
  return dateToDisplay(new Date());
}

function dateToDisplay(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** yyyy-MM-dd (como llega de la API) -> dd/mm/yyyy, para precargar el form al editar. */
function isoToDisplay(iso: string): string {
  const [yyyy, mm, dd] = iso.split('-');
  return yyyy && mm && dd ? `${dd}/${mm}/${yyyy}` : todayDisplay();
}

/** Inserta las "/" a medida que se tipean dígitos: 12092026 -> 12/09/2026 */
function formatFechaInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/**
 * Acepta "1500,50", "1500.50", "1.500,50", "1,500.50" o "1500" — el último
 * "," o "." que aparece se toma como separador decimal, el resto se
 * descarta (separador de miles). Así no importa qué tecla de punto/coma
 * muestre el teclado del celular.
 */
function parseMonto(raw: string): number {
  const limpio = raw.trim().replace(/[^\d.,]/g, '');
  if (!limpio) return NaN;

  const ultimaComa = limpio.lastIndexOf(',');
  const ultimoPunto = limpio.lastIndexOf('.');
  const posSeparador = Math.max(ultimaComa, ultimoPunto);

  if (posSeparador === -1) return Number(limpio);

  const parteEntera = limpio.slice(0, posSeparador).replace(/[.,]/g, '');
  const parteDecimal = limpio.slice(posSeparador + 1).replace(/[.,]/g, '');
  return Number(`${parteEntera}.${parteDecimal}`);
}

/** dd/mm/yyyy -> yyyy-MM-dd (lo que espera la API), o null si está incompleta/inválida. */
function fechaToIso(texto: string): string | null {
  const match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const dia = Number(dd);
  const mes = Number(mm);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export default function MovimientoForm({ onClose, onSaved, onUnauthorized, editing }: Props) {
  useEscapeKey(onClose);

  const [tipo, setTipo] = useState<TipoMovimiento>(editing?.tipo ?? 'GASTO');
  const [fechaTexto, setFechaTexto] = useState(editing ? isoToDisplay(editing.fecha) : todayDisplay());
  const [monto, setMonto] = useState(editing ? String(editing.monto) : '');
  const [concepto, setConcepto] = useState(editing?.concepto ?? '');
  const [bien, setBien] = useState(editing?.bien || BIENES[0]);
  const [notas, setNotas] = useState(editing?.notas ?? '');
  const [comprobante, setComprobante] = useState<File | null>(null);
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
    if (!fechaIso) {
      setError('Fecha inválida (dd/mm/aaaa)');
      return;
    }
    if (!concepto.trim() || !montoNumero || montoNumero <= 0) {
      setError('Completá el concepto y un monto válido');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const datos = {
        fecha: fechaIso,
        tipo,
        monto: montoNumero,
        concepto: concepto.trim(),
        categoria: '',
        bien: bien.trim(),
        notas: notas.trim(),
        comprobante,
      };
      const guardado = editing ? await editarMovimiento(editing.id, datos) : await crearMovimiento(datos);
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
            Gasto
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
        </div>

        <div className="field">
          <label htmlFor="concepto">Concepto</label>
          <input
            id="concepto"
            className="input"
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej: TGI 3er trimestre"
          />
        </div>

        <div className="field">
          <label htmlFor="bien">Bien relacionado</label>
          <select id="bien" className="input" value={bien} onChange={(e) => setBien(e.target.value)}>
            {BIENES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
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
              placeholder="0,00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="notas">Notas (opcional)</label>
          <textarea id="notas" className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        {!editing && (
          <div className="field">
            <label htmlFor="comprobante">Comprobante (foto o PDF, opcional)</label>
            <input
              id="comprobante"
              className="input"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

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
