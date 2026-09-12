export type TipoMovimiento = 'INGRESO' | 'GASTO';

export interface Movimiento {
  id: string;
  fecha: string;
  tipo: TipoMovimiento;
  monto: number;
  concepto: string;
  categoria: string;
  bien: string;
  comprobanteUrl: string;
  comprobanteNombre: string;
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
  categoria: string;
  bien: string;
  notas: string;
  comprobante: File | null;
}

export type FiltroTipo = 'TODOS' | TipoMovimiento;
