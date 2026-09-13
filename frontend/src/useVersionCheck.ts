import { useEffect } from 'react';

const RELOAD_GUARD_KEY = 'comprobantes.reloadedForVersion';

/**
 * Chequea una sola vez al montar — es decir, cuando la app arranca de
 * cero (cerrada del todo y reabierta), no al volver de segundo plano, ya
 * que ahí React no vuelve a montar — si hay una versión más nueva
 * publicada, y de haberla, recarga automáticamente sin preguntar. El
 * guard en sessionStorage evita un loop de recargas si algo sale mal
 * (ej. el deploy quedó a mitad de camino en el momento exacto del chequeo).
 */
export function useVersionCheck(): void {
  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/version.txt', { cache: 'no-store' });
        if (!res.ok) return;
        const latest = (await res.text()).trim();
        if (!latest || latest === __BUILD_ID__) return;
        if (sessionStorage.getItem(RELOAD_GUARD_KEY) === latest) return;
        sessionStorage.setItem(RELOAD_GUARD_KEY, latest);
        window.location.reload();
      } catch {
        // sin conexión momentánea — se vuelve a intentar la próxima vez que abra
      }
    }

    check();
  }, []);
}
