import type { Movimiento, NuevoMovimiento } from './types';

const ACCESS_KEY_STORAGE = 'comprobantes.accessKey';
const USER_NAME_STORAGE = 'comprobantes.userName';

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

export function getUserName(): string | null {
  return localStorage.getItem(USER_NAME_STORAGE);
}

export function setUserName(name: string) {
  localStorage.setItem(USER_NAME_STORAGE, name);
}

/** Intenta leer un error como JSON ({error: "..."}); si la respuesta no es
 * JSON (una página de error de la infraestructura, por ejemplo), devuelve
 * el texto crudo recortado — mejor eso que un genérico "Error inesperado"
 * que no da ninguna pista de qué pasó realmente. */
async function describeErrorResponse(response: Response): Promise<string> {
  const raw = await response.text();
  try {
    const body = JSON.parse(raw);
    if (body?.error) return body.error;
  } catch {
    // no era JSON, seguimos con el texto crudo
  }
  const snippet = raw.trim().replace(/\s+/g, ' ').slice(0, 200);
  return snippet ? `HTTP ${response.status}: ${snippet}` : `HTTP ${response.status} sin cuerpo de respuesta`;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const key = getAccessKey();
  const headers = new Headers(init.headers);
  if (key) {
    headers.set('X-Access-Key', key);
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers });
  } catch (err) {
    const detalle = err instanceof Error ? err.message : String(err);
    throw new ApiError(`No se pudo conectar con el servidor (${detalle})`, 0);
  }

  if (response.status === 401) {
    clearAccessKey();
    throw new ApiError(await describeErrorResponse(response), 401);
  }

  if (!response.ok) {
    throw new ApiError(await describeErrorResponse(response), response.status);
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
  const userName = getUserName();
  if (userName) form.set('cargadoPor', userName);

  const response = await request('/movimientos', { method: 'POST', body: form });
  return response.json();
}

export async function editarMovimiento(id: string, data: NuevoMovimiento): Promise<Movimiento> {
  const form = new FormData();
  form.set('fecha', data.fecha);
  form.set('tipo', data.tipo);
  form.set('monto', String(data.monto));
  form.set('concepto', data.concepto);
  if (data.categoria) form.set('categoria', data.categoria);
  if (data.bien) form.set('bien', data.bien);
  if (data.notas) form.set('notas', data.notas);

  const response = await request(`/movimientos/${id}`, { method: 'PUT', body: form });
  return response.json();
}

export async function adjuntarComprobante(id: string, file: File, fecha: string, concepto: string): Promise<Movimiento> {
  const form = new FormData();
  form.set('comprobante', file);
  form.set('fecha', fecha);
  form.set('concepto', concepto);

  const response = await request(`/movimientos/${id}/comprobante`, { method: 'PUT', body: form });
  return response.json();
}

export async function borrarComprobante(id: string): Promise<Movimiento> {
  const response = await request(`/movimientos/${id}/comprobante`, { method: 'DELETE' });
  return response.json();
}

/** Trae el archivo del comprobante como blob (con el header de auth, no por
 * query param) para mostrarlo dentro de un visor propio de la app — así no
 * hace falta navegar afuera (una PWA instalada no tiene botón "atrás"). */
export async function fetchComprobanteArchivo(id: string): Promise<{ blob: Blob; contentType: string }> {
  const response = await request(`/movimientos/${id}/comprobante/archivo`);
  const contentType = response.headers.get('Content-Type') ?? 'application/octet-stream';
  const blob = await response.blob();
  return { blob, contentType };
}

export async function eliminarMovimiento(id: string): Promise<void> {
  await request(`/movimientos/${id}`, { method: 'DELETE' });
}
