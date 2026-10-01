import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Render de las notas (Markdown guardado tal cual en la celda de la planilla).
 * Se carga lazy desde Notas.tsx, igual que el chat IA: react-markdown pesa
 * casi lo mismo que el resto de la app. react-markdown no renderiza HTML
 * crudo, así que no hace falta sanitizar.
 */
export default function NotasMarkdown({ texto }: { texto: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {texto}
    </Markdown>
  );
}
