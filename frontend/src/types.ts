export type TipoMovimiento = 'INGRESO' | 'GASTO';

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
