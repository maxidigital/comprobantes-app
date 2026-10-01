export type TipoMovimiento = 'INGRESO' | 'GASTO';

export type Rol = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface Comprobante {
  id: string;
  movimientoId: string;
  url: string;
  nombre: string;
  creadoEn: string;
}

export interface Movimiento {
  id: string;
  fecha: string;
  tipo: TipoMovimiento;
  monto: number;
  concepto: string;
  bien: string;
  comprobantes: Comprobante[];
  notas: string;
  creadoEn: string;
  cargadoPor: string;
  comprobantePendiente: boolean;
}

export interface NuevoMovimiento {
  fecha: string;
  tipo: TipoMovimiento;
  monto: number;
  concepto: string;
  bien: string;
  notas: string;
  comprobantes: File[];
}

export type FiltroTipo = 'TODOS' | TipoMovimiento;

export interface Aviso {
  id: string;
  fecha: string;
  texto: string;
  bien: string;
  autor: string;
  creadoEn: string;
}

export interface NuevoAviso {
  fecha: string;
  texto: string;
  bien: string;
}

export type AutorMensaje = 'USUARIO' | 'IA';

export interface MensajeChat {
  autor: AutorMensaje;
  texto: string;
}

/**
 * Cajas con el sistema completo de movimientos (comprobantes, avisos,
 * filtros): la sucesión y la Remodelación Iriondo. Cada una con sus propias
 * pestañas en la planilla; la de la sucesión es la única con "bien".
 */
export type CajaMovimientos = 'sucesion' | 'remodelacion';

/** Cajas simples (solo ADMIN, sin comprobantes ni avisos) — ver cajas.ts. */
export type CajaId = 'aportes';

export interface MovimientoCaja {
  id: string;
  fecha: string;
  tipo: TipoMovimiento;
  /** En la moneda de la caja (dólares en Aportes). */
  monto: number;
  /** Pesos por dólar, opcional. */
  cotizacion?: number | null;
  /** monto * cotizacion, lo calcula el backend. */
  montoArs?: number | null;
  concepto: string;
  aportante?: string;
  notas: string;
  creadoEn: string;
  cargadoPor?: string;
}

export interface NuevoMovimientoCaja {
  fecha: string;
  tipo: TipoMovimiento;
  monto: number;
  cotizacion?: number | null;
  concepto: string;
  aportante?: string;
  notas: string;
}
