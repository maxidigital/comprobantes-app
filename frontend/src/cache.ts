/**
 * Caché local de lo último que devolvió la API para cada caja, para que
 * cambiar de caja (o abrir la app) muestre la lista al instante y recién
 * después se refresque en segundo plano (stale-while-revalidate). Vive en
 * memoria y además en localStorage; si localStorage falla (lleno, modo
 * privado) se sigue sin él. Se borra al salir (Salir / 401), porque el
 * celular puede ser compartido.
 */
const PREFIJO = 'comprobantes.cache.';
const memoria = new Map<string, unknown>();

export function leerCache<T>(clave: string): T | null {
  if (memoria.has(clave)) return memoria.get(clave) as T;
  try {
    const crudo = localStorage.getItem(PREFIJO + clave);
    if (crudo === null) return null;
    const valor = JSON.parse(crudo) as T;
    memoria.set(clave, valor);
    return valor;
  } catch {
    return null;
  }
}

export function guardarCache(clave: string, valor: unknown) {
  memoria.set(clave, valor);
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
  } catch {
    // sin espacio o sin localStorage: queda solo en memoria
  }
}

export function borrarCaches() {
  memoria.clear();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIJO))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // nada que borrar
  }
}
