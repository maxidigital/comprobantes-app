import { useEffect } from 'react';
import type { RefObject } from 'react';

/** Publica la altura real de `ref` como `--top-bar-height` en :root, para
 * que el filter-bar pueda pegarse justo debajo sin hardcodear un offset
 * (la altura del header varía con el tema/safe-area/tamaño de fuente). */
export function useHeaderHeightVar(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      document.documentElement.style.setProperty('--top-bar-height', `${el!.offsetHeight}px`);
    }

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}
