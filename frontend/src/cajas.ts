import type { Moneda } from './format';
import type { CajaId, CajaMovimientos } from './types';

/**
 * Las tres cajas, cada una en sus propias pestañas de la planilla e
 * independientes entre sí (que la plata de la obra no se mezcle con la de
 * los alquileres):
 * - Sucesión: alquileres y gastos corrientes de los bienes.
 * - Remodelación Iriondo: los gastos de la obra, en pesos. Mismo sistema
 *   que la sucesión (comprobantes, avisos, filtros), sin "bien".
 * - Aportes personales (solo ADMIN): lo que cada heredero pone de su
 *   bolsillo para la obra, en dólares para que la inflación no licúe la
 *   deuda. INGRESO = aporta, GASTO = se le devuelve; el saldo es lo que se
 *   le debe. Caja simple (CajaView), sin comprobantes ni avisos.
 */
export type Vista = CajaMovimientos | CajaId;

export const VISTAS: { id: Vista; titulo: string; soloAdmin: boolean }[] = [
  { id: 'sucesion', titulo: 'Sucesión', soloAdmin: false },
  { id: 'remodelacion', titulo: 'Remodelación Iriondo', soloAdmin: false },
  { id: 'aportes', titulo: 'Aportes personales', soloAdmin: true },
];

export function esCajaMovimientos(vista: Vista): vista is CajaMovimientos {
  return vista === 'sucesion' || vista === 'remodelacion';
}

/** Solo la sucesión distingue bienes; la remodelación es toda de Iriondo. */
export function tieneBien(caja: CajaMovimientos): boolean {
  return caja === 'sucesion';
}

export interface CajaConfig {
  id: CajaId;
  titulo: string;
  moneda: Moneda;
  conAportante: boolean;
  etiquetasTipo: { ingreso: string; gasto: string };
  etiquetasTotales: { ingresos: string; gastos: string; balance: string };
}

export const CAJAS: Record<CajaId, CajaConfig> = {
  aportes: {
    id: 'aportes',
    titulo: 'Aportes personales',
    moneda: 'USD',
    conAportante: true,
    etiquetasTipo: { ingreso: 'Aporte', gasto: 'Devolución' },
    etiquetasTotales: { ingresos: 'Aportado', gastos: 'Devuelto', balance: 'Deuda' },
  },
};

export const APORTANTES = ['Maxi', 'Gustavo', 'Nicolás'];
