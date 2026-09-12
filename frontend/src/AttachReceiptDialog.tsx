import { FormEvent, useState } from 'react';
import { adjuntarComprobante, ApiError } from './api';
import type { Movimiento } from './types';

interface Props {
  movimiento: Movimiento;
  onClose: () => void;
  onAttached: (movimiento: Movimiento) => void;
  onUnauthorized: () => void;
}

export default function AttachReceiptDialog({ movimiento, onClose, onAttached, onUnauthorized }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Elegí un archivo');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const actualizado = await adjuntarComprobante(movimiento.id, file);
      onAttached(actualizado);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : 'No se pudo subir el comprobante');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Adjuntar comprobante</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>{movimiento.concepto}</p>

        <div className="field">
          <label htmlFor="attach-file">Foto o PDF del comprobante</label>
          <input
            id="attach-file"
            className="input"
            type="file"
            accept="image/*,.pdf"
            autoFocus
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="btn-plain" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-solid" disabled={submitting}>
            {submitting ? 'Subiendo…' : 'Adjuntar'}
          </button>
        </div>
      </form>
    </div>
  );
}
