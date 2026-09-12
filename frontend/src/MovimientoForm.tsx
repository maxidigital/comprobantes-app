import { FormEvent, useState } from 'react';
import { ApiError, crearMovimiento } from './api';
import type { Movimiento, TipoMovimiento } from './types';

interface Props {
  onClose: () => void;
  onCreated: (movimiento: Movimiento) => void;
  onUnauthorized: () => void;
}

const CATEGORIAS: Record<TipoMovimiento, string[]> = {
  GASTO: ['Impuestos', 'Servicios', 'Mantenimiento', 'Honorarios profesionales', 'Seguros', 'Gastos judiciales', 'Otro'],
  INGRESO: ['Alquiler cobrado', 'Venta de bien', 'Dividendos/Rentas', 'Otro'],
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function MovimientoForm({ onClose, onCreated, onUnauthorized }: Props) {
  const [tipo, setTipo] = useState<TipoMovimiento>('GASTO');
  const [fecha, setFecha] = useState(today());
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [bien, setBien] = useState('');
  const [notas, setNotas] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const montoNumero = Number(monto);
    if (!concepto.trim() || !montoNumero || montoNumero <= 0) {
      setError('Completá el concepto y un monto válido');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const creado = await crearMovimiento({
        fecha,
        tipo,
        monto: montoNumero,
        concepto: concepto.trim(),
        categoria,
        bien: bien.trim(),
        notas: notas.trim(),
        comprobante,
      });
      onCreated(creado);
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
    <div className="dialog-overlay" onClick={onClose}>
      <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Nuevo movimiento</h2>

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
          <input id="fecha" className="input" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="monto">Monto</label>
          <input
            id="monto"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="concepto">Concepto</label>
          <input
            id="concepto"
            className="input"
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej: ABL 3er trimestre"
          />
        </div>

        <div className="field">
          <label htmlFor="categoria">Categoría (opcional)</label>
          <input
            id="categoria"
            className="input"
            list="categorias-sugeridas"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <datalist id="categorias-sugeridas">
            {CATEGORIAS[tipo].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="bien">Bien relacionado (opcional)</label>
          <input
            id="bien"
            className="input"
            type="text"
            value={bien}
            onChange={(e) => setBien(e.target.value)}
            placeholder="Ej: Departamento Belgrano"
          />
        </div>

        <div className="field">
          <label htmlFor="notas">Notas (opcional)</label>
          <textarea id="notas" className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

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
