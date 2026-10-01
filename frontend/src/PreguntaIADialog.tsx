import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ApiError, preguntarIA } from './api';
import type { CajaMovimientos, MensajeChat } from './types';
import { useEscapeKey } from './useEscapeKey';

// El historial vive solo en este dispositivo (no hay sesión server-side):
// sobrevive a un refresh, no se sincroniza entre celulares.
const HISTORIAL_STORAGE = 'comprobantes.chatIA';

/** Las cajas que la IA puede consultar (Aportes todavía no: está en dólares y no tiene bienes). */
const CAJAS_IA: { id: CajaMovimientos; titulo: string; sugerencias: string[] }[] = [
  {
    id: 'sucesion',
    titulo: 'Alquileres',
    sugerencias: [
      '¿Cuál es el promedio de alquileres de San Martín en 2026?',
      '¿Cuánto se gastó en total en 2025?',
      '¿Cuál fue el gasto más grande de San Martín?',
    ],
  },
  {
    id: 'remodelacion',
    titulo: 'Remodelación',
    sugerencias: [
      '¿Cuánto costó la obra en 2022?',
      '¿Cuánto se gastó en mano de obra?',
      '¿Cuál fue el gasto más grande de la obra?',
    ],
  },
  {
    id: 'varios',
    titulo: 'Varios',
    sugerencias: ['¿Cuánto se gastó en abogados?', '¿Cuánto se gastó en trámites por año?'],
  },
];

function tituloCaja(caja: CajaMovimientos | undefined): string | undefined {
  return CAJAS_IA.find((c) => c.id === caja)?.titulo;
}

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
  /** La caja que se está viendo al abrir el chat; se puede cambiar adentro. */
  cajaInicial: CajaMovimientos;
  onClose: () => void;
  onUnauthorized: () => void;
}

export default function PreguntaIADialog({ cajaInicial, onClose, onUnauthorized }: Props) {
  useEscapeKey(onClose);

  const [caja, setCaja] = useState<CajaMovimientos>(cajaInicial);
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

    const conPregunta: MensajeChat[] = [...mensajes, { autor: 'USUARIO', texto: limpia, caja }];
    setMensajes(conPregunta);
    setTexto('');
    setError(null);
    setEnviando(true);
    try {
      const respuesta = await preguntarIA(conPregunta, caja);
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

          <div className="chat-caja-selector">
            <span>Sobre la caja</span>
            <div className="segmented">
              {CAJAS_IA.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={caja === c.id ? 'active' : ''}
                  onClick={() => setCaja(c.id)}
                  aria-pressed={caja === c.id}
                >
                  {c.titulo}
                </button>
              ))}
            </div>
          </div>

          {mensajes.length === 0 && (
            <div className="chat-vacio">
              <p>
                Preguntá sobre los movimientos en lenguaje natural. La IA interpreta la pregunta y la cuenta la hace la
                app sobre la planilla real.
              </p>
              <div className="chat-sugerencias">
                {(CAJAS_IA.find((c) => c.id === caja)?.sugerencias ?? []).map((s) => (
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
                  {tituloCaja(m.caja) && <span className="chat-caja">{tituloCaja(m.caja)}</span>}
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
