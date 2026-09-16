import type { Aviso, Movimiento, NuevoAviso, NuevoMovimiento, Rol } from './types';

const ACCESS_KEY_STORAGE = 'comprobantes.accessKey';
const USER_NAME_STORAGE = 'comprobantes.userName';
const USER_ROLE_STORAGE = 'comprobantes.userRole';

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
  clearUserRole();
}

export function getUserName(): string | null {
  return localStorage.getItem(USER_NAME_STORAGE);
}

export function setUserName(name: string) {
  localStorage.setItem(USER_NAME_STORAGE, name);
}

export function getUserRole(): Rol | null {
  return localStorage.getItem(USER_ROLE_STORAGE) as Rol | null;
}

export function setUserRole(rol: Rol) {
  localStorage.setItem(USER_ROLE_STORAGE, rol);
}

export function clearUserRole() {
  localStorage.removeItem(USER_ROLE_STORAGE);
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
  const nombre = getUserName();
  const headers = new Headers(init.headers);
  if (key) {
    headers.set('X-Access-Key', key);
  }
  if (nombre) {
    headers.set('X-User-Name', nombre);
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

/** Valida contraseña + nombre contra el backend y devuelve el rol resuelto (usado en el gate de acceso). */
export async function login(nombre: string, key: string): Promise<{ nombre: string; rol: Rol }> {
  const headers = new Headers({ 'X-Access-Key': key, 'X-User-Name': nombre });
  const response = await fetch('/api/auth/whoami', { headers });
  if (!response.ok) {
    throw new ApiError(await describeErrorResponse(response), response.status);
  }
  return response.json();
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
  if (data.bien) form.set('bien', data.bien);
  if (data.notas) form.set('notas', data.notas);
  data.comprobantes.forEach((file) => form.append('comprobantes', file));
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
  if (data.bien) form.set('bien', data.bien);
  if (data.notas) form.set('notas', data.notas);

  const response = await request(`/movimientos/${id}`, { method: 'PUT', body: form });
  return response.json();
}

/** Agrega uno o más comprobantes a un movimiento que ya existe — no reemplaza los que ya tenía. */
export async function agregarComprobantes(movimientoId: string, files: File[]): Promise<Movimiento> {
  const form = new FormData();
  files.forEach((file) => form.append('comprobantes', file));

  const response = await request(`/movimientos/${movimientoId}/comprobantes`, { method: 'POST', body: form });
  return response.json();
}

export async function borrarComprobante(movimientoId: string, comprobanteId: string): Promise<Movimiento> {
  const response = await request(`/movimientos/${movimientoId}/comprobantes/${comprobanteId}`, { method: 'DELETE' });
  return response.json();
}

/** Trae un comprobante puntual como blob (con el header de auth, no por
 * query param) para mostrarlo dentro de un visor propio de la app — así no
 * hace falta navegar afuera (una PWA instalada no tiene botón "atrás"). */
export async function fetchComprobanteArchivo(
  movimientoId: string,
  comprobanteId: string,
): Promise<{ blob: Blob; contentType: string }> {
  const response = await request(`/movimientos/${movimientoId}/comprobantes/${comprobanteId}/archivo`);
  const contentType = response.headers.get('Content-Type') ?? 'application/octet-stream';
  const blob = await response.blob();
  return { blob, contentType };
}

export async function eliminarMovimiento(id: string): Promise<void> {
  await request(`/movimientos/${id}`, { method: 'DELETE' });
}

export async function listAvisos(): Promise<Aviso[]> {
  const response = await request('/avisos');
  return response.json();
}

export async function crearAviso(data: NuevoAviso): Promise<Aviso> {
  const form = new FormData();
  form.set('fecha', data.fecha);
  form.set('bien', data.bien);
  form.set('texto', data.texto);
  const userName = getUserName();
  if (userName) form.set('autor', userName);

  const response = await request('/avisos', { method: 'POST', body: form });
  return response.json();
}

export async function eliminarAviso(id: string): Promise<void> {
  await request(`/avisos/${id}`, { method: 'DELETE' });
}
