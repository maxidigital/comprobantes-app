import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react';

const NotasMarkdown = lazy(() => import('./NotasMarkdown'));

/**
 * Las notas se guardan como Markdown en la misma celda de la planilla (sigue
 * siendo legible si se abre la planilla). Las notas viejas son texto plano y
 * se ven igual: los saltos de línea se respetan por CSS (.notas-md p).
 */
export function NotasTexto({ texto }: { texto: string }) {
  if (!texto) return <p className="detail-value">—</p>;
  return (
    <div className="detail-value notas-md">
      <Suspense fallback={<p>{texto}</p>}>
        <NotasMarkdown texto={texto} />
      </Suspense>
    </div>
  );
}

/** Para la lista: una línea sin la sintaxis de Markdown, así no se ven asteriscos sueltos. */
export function notasPlano(md: string): string {
  return md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s?)/gm, '')
    .replace(/(?<![\w*])(\*\*|\*|~~|`)(\S(?:.*?\S)?)\1(?![\w*])/g, '$2')
    .replace(/\s*\n\s*/g, ' · ')
    .trim();
}

type Formato = 'negrita' | 'cursiva' | 'lista' | 'link';

interface EditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

/** El textarea de notas con una barrita que inserta la sintaxis de Markdown, y vista previa. */
export function NotasEditor({ id, value, onChange }: EditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  // La selección a restaurar después de que React escriba el valor nuevo en el textarea.
  const seleccionPendiente = useRef<[number, number] | null>(null);

  useLayoutEffect(() => {
    const ta = ref.current;
    const sel = seleccionPendiente.current;
    if (!ta || !sel) return;
    seleccionPendiente.current = null;
    ta.focus();
    ta.setSelectionRange(sel[0], sel[1]);
  }, [value]);

  function aplicar(formato: Formato) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: ini, selectionEnd: fin } = ta;
    const sel = value.slice(ini, fin);
    let nuevo: string;
    let selIni: number;
    let selFin: number;

    if (formato === 'lista') {
      // Agrega "- " al principio de cada línea tocada por la selección.
      const desde = value.lastIndexOf('\n', ini - 1) + 1;
      const bloque = value.slice(desde, fin);
      const conViñetas = bloque
        .split('\n')
        .map((l) => (l.startsWith('- ') ? l : `- ${l}`))
        .join('\n');
      nuevo = value.slice(0, desde) + conViñetas + value.slice(fin);
      selIni = selFin = desde + conViñetas.length;
    } else if (formato === 'link') {
      const texto = sel || 'texto';
      const insert = `[${texto}](https://)`;
      nuevo = value.slice(0, ini) + insert + value.slice(fin);
      // Deja seleccionada la URL para tipearla directamente.
      selIni = ini + texto.length + 3;
      selFin = selIni + 'https://'.length;
    } else {
      const marca = formato === 'negrita' ? '**' : '*';
      const texto = sel || (formato === 'negrita' ? 'negrita' : 'cursiva');
      nuevo = value.slice(0, ini) + marca + texto + marca + value.slice(fin);
      selIni = ini + marca.length;
      selFin = selIni + texto.length;
    }

    seleccionPendiente.current = [selIni, selFin];
    onChange(nuevo);
  }

  return (
    <div className="notas-editor">
      <div className="notas-toolbar" role="toolbar" aria-label="Formato de las notas">
        {/* onMouseDown preventDefault: que el click no le saque el foco (y la selección) al textarea. */}
        <button type="button" className="btn-plain" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar('negrita')} disabled={vistaPrevia} aria-label="Negrita">
          <b>B</b>
        </button>
        <button type="button" className="btn-plain" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar('cursiva')} disabled={vistaPrevia} aria-label="Cursiva">
          <i>I</i>
        </button>
        <button type="button" className="btn-plain" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar('lista')} disabled={vistaPrevia} aria-label="Lista">
          • Lista
        </button>
        <button type="button" className="btn-plain" onMouseDown={(e) => e.preventDefault()} onClick={() => aplicar('link')} disabled={vistaPrevia} aria-label="Link">
          🔗 Link
        </button>
        <button
          type="button"
          className={`btn-plain notas-toolbar-preview${vistaPrevia ? ' notas-toolbar-preview--activa' : ''}`}
          onClick={() => setVistaPrevia((v) => !v)}
          aria-pressed={vistaPrevia}
        >
          {vistaPrevia ? 'Editar' : 'Vista previa'}
        </button>
      </div>
      {vistaPrevia ? (
        <NotasTexto texto={value.trim()} />
      ) : (
        <textarea id={id} ref={ref} className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
