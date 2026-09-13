import { useEffect, useState } from 'react';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Compara el build con el que arrancó la app (embebido en el bundle) contra
 * /version.txt (siempre pedido sin caché) para detectar que hay una versión
 * nueva publicada — sobre todo pensado para el caso de "app agregada a la
 * pantalla de inicio del celular", que si no se le avisa puede quedarse
 * mostrando una versión vieja indefinidamente.
 */
export function useVersionCheck(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch('/version.txt', { cache: 'no-store' });
        if (!res.ok) return;
        const latest = (await res.text()).trim();
        if (!cancelled && latest && latest !== __BUILD_ID__) {
          setUpdateAvailable(true);
        }
      } catch {
        // sin conexión momentánea — no molestar, se reintenta solo
      }
    }

    check();

    function onVisible() {
      if (document.visibilityState === 'visible') check();
    }
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, []);

  return updateAvailable;
}
