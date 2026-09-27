import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ApiError, preguntarIA } from './api';
import type { MensajeChat } from './types';
import { useEscapeKey } from './useEscapeKey';

// El historial vive solo en este dispositivo (no hay sesión server-side):
// sobrevive a un refresh, no se sincroniza entre celulares.
const HISTORIAL_STORAGE = 'comprobantes.chatIA';

const SUGERENCIAS = [
  '¿Cuál es el promedio de alquileres de San Martín en 2026?',
  '¿Cuánto se gastó en total en 2025?',
  '¿Cuál fue el gasto más grande de San Martín?',
];

/** En el celular una tabla ancha se desplaza de costado dentro de la burbuja en vez de romper la pantalla. */
function TablaConScroll({ children }: { children?: ReactNode }) {
  return (
    <div className="chat-tabla-scroll">
      <table>{children}</table>
    </div>
  );
}

function leerHistorial(): MensajeChat[] {
  try {
    const raw = localStorage.getItem(HISTORIAL_STORAGE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface Props {
  onClose: () => void;
  onUnauthorized: () => void;
}

export default function PreguntaIADialog({ onClose, onUnauthorized }: Props) {
  useEscapeKey(onClose);

  const [mensajes, setMensajes] = useState<MensajeChat[]>(leerHistorial);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORIAL_STORAGE, JSON.stringify(mensajes));
    } catch {
      // sin storage (modo privado) el chat funciona igual, solo no persiste
    }
  }, [mensajes]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [mensajes, enviando]);

  async function enviar(pregunta: string) {
    const limpia = pregunta.trim();
    if (!limpia || enviando) return;

    const conPregunta: MensajeChat[] = [...mensajes, { autor: 'USUARIO', texto: limpia }];
    setMensajes(conPregunta);
    setTexto('');
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await preguntarIA(conPregunta);
      setMensajes([...conPregunta, { autor: 'IA', texto: respuesta }]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      // Se saca la pregunta que falló y vuelve al input, para no dejar en el
      // historial una pregunta sin respuesta que confunda al siguiente envío.
      setMensajes(mensajes);
      setTexto(limpia);
      setError(err instanceof Error ? err.message : 'No se pudo obtener una respuesta');
    } finally {
      setEnviando(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    enviar(texto);
  }

  function nuevaConversacion() {
    setMensajes([]);
    setError(null);
  }

  return (
    <div className="dialog-overlay dialog-overlay--fullscreen" onClick={onClose}>
      <form className="dialog dialog--fullscreen" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="dialog-scroll">
          <div className="dialog-header">
            <h2>Preguntale a la IA</h2>
            <button type="button" className="btn-plain menu-icon-btn" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>

          {mensajes.length === 0 && (
            <div className="chat-vacio">
              <p>
                Preguntá sobre los movimientos en lenguaje natural. La IA interpreta la pregunta y la cuenta la
                hace la app sobre la planilla real.
              </p>
              <div className="chat-sugerencias">
                {SUGERENCIAS.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => enviar(s)} disabled={enviando}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="chat-mensajes">
            {mensajes.map((m, i) =>
              m.autor === 'IA' ? (
                // La IA responde en Markdown (negritas, listas, tablas para
                // resultados agrupados). react-markdown no renderiza HTML
                // crudo, así que no hace falta sanitizar.
                <div key={i} className="chat-burbuja chat-burbuja--ia chat-markdown">
                  <Markdown remarkPlugins={[remarkGfm]} components={{ table: TablaConScroll }}>
                    {m.texto}
                  </Markdown>
                </div>
              ) : (
                <div key={i} className="chat-burbuja chat-burbuja--usuario">
                  {m.texto}
                </div>
              ),
            )}
            {enviando && <div className="chat-burbuja chat-burbuja--ia chat-burbuja--pensando">Pensando…</div>}
            <div ref={finRef} />
          </div>

          {error && <p className="error-text">{error}</p>}
        </div>

        <div className="dialog-actions chat-input-bar">
          {mensajes.length > 0 && (
            <button type="button" className="btn-plain" onClick={nuevaConversacion} disabled={enviando}>
              Nueva
            </button>
          )}
          <input
            className="input"
            type="text"
            placeholder="Escribí tu pregunta"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            enterKeyHint="send"
          />
          <button type="submit" className="btn-solid" disabled={enviando || !texto.trim()}>
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
