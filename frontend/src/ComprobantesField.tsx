import { ChangeEvent, useRef } from 'react';
import type { Comprobante } from './types';

interface Props {
  id: string;
  /** En edición: los que ya tiene (con "Borrar", que borra en el momento). */
  actuales: Comprobante[];
  /** Los elegidos que todavía no se subieron (se suben al guardar). */
  nuevos: File[];
  onNuevosChange: (nuevos: File[]) => void;
  onBorrar: (comprobanteId: string) => void;
  borrandoId: string | null;
  editando: boolean;
}

/** El campo de comprobantes de un formulario (movimiento o aviso): lista de los que ya tiene, los nuevos y el botón para sumar. */
export default function ComprobantesField({ id, actuales, nuevos, onNuevosChange, onBorrar, borrandoId, editando }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Acumula lo elegido (no lo reemplaza) y limpia el input, para poder abrir
   * el selector varias veces y sumar comprobantes de a poco en la misma ventana. */
  function handleAgregarArchivos(e: ChangeEvent<HTMLInputElement>) {
    const elegidos = Array.from(e.target.files ?? []);
    if (elegidos.length > 0) onNuevosChange([...nuevos, ...elegidos]);
    e.target.value = '';
  }

  return (
    <div className="field">
      <label htmlFor={id}>{editando ? 'Agregar comprobantes (opcional)' : 'Comprobantes (foto o PDF, opcional)'}</label>

      {actuales.length > 0 && (
        <ul className="receipt-list">
          {actuales.map((c) => (
            <li key={c.id} className="receipt-list-item">
              <span className="receipt-list-name">{c.nombre}</span>
              <button
                type="button"
                className="btn-plain"
                onClick={() => onBorrar(c.id)}
                disabled={borrandoId === c.id}
                style={{ color: 'var(--danger)' }}
              >
                {borrandoId === c.id ? 'Borrando…' : 'Borrar'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {nuevos.length > 0 && (
        <ul className="receipt-list">
          {nuevos.map((file, i) => (
            <li key={`${file.name}-${i}`} className="receipt-list-item">
              <span className="receipt-list-name">{file.name}</span>
              <button
                type="button"
                className="btn-plain"
                onClick={() => onNuevosChange(nuevos.filter((_, j) => j !== i))}
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
        id={id}
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
  );
}
