import type { Movimiento, NuevoMovimiento } from './types';

const ACCESS_KEY_STORAGE = 'comprobantes.accessKey';
const ADMIN_KEY_STORAGE = 'comprobantes.adminKey';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function getAccessKey(): string | null {
  return localStorage.getItem(ACCESS_KEY_STORAGE);
}

export function setAccessKey(key: string) {
  localStorage.setItem(ACCESS_KEY_STORAGE, key);
}

export function clearAccessKey() {
  localStorage.removeItem(ACCESS_KEY_STORAGE);
}

export function getAdminKey(): string | null {
  return localStorage.getItem(ADMIN_KEY_STORAGE);
}

export function setAdminKey(key: string) {
  localStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export function clearAdminKey() {
  localStorage.removeItem(ADMIN_KEY_STORAGE);
}

export function isAdminUnlocked(): boolean {
  return !!getAdminKey();
}

async function request(path: string, init: RequestInit = {}, useAdminKey = false): Promise<Response> {
  const key = useAdminKey ? getAdminKey() : getAccessKey();
  const headers = new Headers(init.headers);
  if (key) {
    headers.set('X-Access-Key', key);
  }

  const response = await fetch(`/api${path}`, { ...init, headers });

  if (response.status === 401) {
    if (useAdminKey) {
      clearAdminKey();
    } else {
      clearAccessKey();
    }
    const body = await response.json().catch(() => ({ error: 'Clave inválida' }));
    throw new ApiError(body.error ?? 'Clave inválida', 401);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Error inesperado' }));
    throw new ApiError(body.error ?? 'Error inesperado', response.status);
  }

  return response;
}

/** Also doubles as the access-code check on the gate screen. */
export async function tryAccessKey(key: string): Promise<boolean> {
  const headers = new Headers({ 'X-Access-Key': key });
  const response = await fetch('/api/movimientos', { headers });
  return response.ok;
}

export async function listMovimientos(): Promise<Movimiento[]> {
  const response = await request('/movimientos');
  return response.json();
}

export async function crearMovimiento(data: NuevoMovimiento): Promise<Movimiento> {
  const form = new FormData();
  form.set('fecha', data.fecha);
  form.set('tipo', data.tipo);
  form.set('monto', String(data.monto));
  form.set('concepto', data.concepto);
  if (data.categoria) form.set('categoria', data.categoria);
  if (data.bien) form.set('bien', data.bien);
  if (data.notas) form.set('notas', data.notas);
  if (data.comprobante) form.set('comprobante', data.comprobante);

  const response = await request('/movimientos', { method: 'POST', body: form }, true);
  return response.json();
}

export async function adjuntarComprobante(id: string, file: File): Promise<Movimiento> {
  const form = new FormData();
  form.set('comprobante', file);

  const response = await request(`/movimientos/${id}/comprobante`, { method: 'PUT', body: form }, true);
  return response.json();
}

export async function eliminarMovimiento(id: string): Promise<void> {
  await request(`/movimientos/${id}`, { method: 'DELETE' }, true);
}
