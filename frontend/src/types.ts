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

/** Las cajas que solo ve ADMIN (Remodelación Iriondo en ARS, Aportes personales en USD) — ver cajas.ts. */
export type CajaId = 'remodelacion' | 'aportes';

export interface MovimientoCaja {
  id: string;
  fecha: string;
  tipo: TipoMovimiento;
  monto: number;
  concepto: string;
  /** Solo en la caja de aportes. */
  aportante?: string;
  notas: string;
  creadoEn: string;
}

export interface NuevoMovimientoCaja {
  fecha: string;
  tipo: TipoMovimiento;
  monto: number;
  concepto: string;
  aportante?: string;
  notas: string;
}
