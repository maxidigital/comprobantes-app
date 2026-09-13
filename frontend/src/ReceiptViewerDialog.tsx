import { useEffect, useState } from 'react';
import { ApiError, fetchComprobanteArchivo } from './api';
import { useEscapeKey } from './useEscapeKey';

interface Props {
  movimientoId: string;
  onClose: () => void;
  onUnauthorized: () => void;
}

/**
 * Muestra el comprobante adentro de la app (nunca navegando a otra URL): una
 * PWA instalada no tiene barra de navegación ni botón "atrás", así que un
 * <a target="_blank"> deja al usuario sin forma de volver al listado.
 */
export default function ReceiptViewerDialog({ movimientoId, onClose, onUnauthorized }: Props) {
  useEscapeKey(onClose);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    fetchComprobanteArchivo(movimientoId)
      .then(({ blob, contentType }) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
        setContentType(contentType);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(err instanceof Error ? err.message : 'No se pudo abrir el comprobante');
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [movimientoId, onUnauthorized]);

  return (
    <div className="dialog-overlay dialog-overlay--fullscreen" onClick={onClose}>
      <div className="dialog dialog--fullscreen receipt-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-scroll receipt-viewer-scroll">
          <div className="dialog-header">
            <h2>Comprobante</h2>
            <button type="button" className="btn-plain menu-icon-btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>

          <div className="receipt-viewer-body">
            {error && <p className="error-text">{error}</p>}
            {!error && !objectUrl && <p className="detail-value">Cargando…</p>}
            {!error && objectUrl && contentType.startsWith('image/') && (
              <img src={objectUrl} alt="Comprobante" className="receipt-viewer-image" />
            )}
            {!error && objectUrl && contentType === 'application/pdf' && (
              <embed src={objectUrl} type="application/pdf" className="receipt-viewer-pdf" />
            )}
            {!error && objectUrl && !contentType.startsWith('image/') && contentType !== 'application/pdf' && (
              <p className="detail-value">No se puede previsualizar este tipo de archivo.</p>
            )}
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn-plain" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
