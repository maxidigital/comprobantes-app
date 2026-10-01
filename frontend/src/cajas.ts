import type { Moneda } from './format';
import type { CajaId, CajaMovimientos, Rol } from './types';

/**
 * Las tres cajas, cada una en sus propias pestañas de la planilla e
 * independientes entre sí (que la plata de la obra no se mezcle con la de
 * los alquileres):
 * - Sucesión: alquileres y gastos corrientes de los bienes.
 * - Remodelación Iriondo: los gastos de la obra, en pesos. Mismo sistema
 *   que la sucesión (comprobantes, avisos, filtros), sin "bien".
 * - Aportes personales (solo Maxi y Gustavo, ADMIN/EDITOR): lo que cada heredero pone de su
 *   bolsillo para la obra, en dólares para que la inflación no licúe la
 *   deuda. INGRESO = aporta, GASTO = se le devuelve; el saldo es lo que se
 *   le debe. Con cotización opcional (y su equivalente en pesos). Sin
 *   comprobantes ni avisos (CajaView). Nada se vincula solo entre cajas:
 *   un aporte se carga a mano acá y, en pesos, en Remodelación.
 */
export type Vista = CajaMovimientos | CajaId;

/** roles: quiénes ven la caja en el desplegable (sin roles = todos). Puro UX, el interceptor no lo restringe. */
export const VISTAS: { id: Vista; titulo: string; roles?: Rol[] }[] = [
  { id: 'sucesion', titulo: 'Sucesión' },
  { id: 'remodelacion', titulo: 'Remodelación Iriondo' },
  { id: 'aportes', titulo: 'Aportes personales', roles: ['ADMIN', 'EDITOR'] },
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
  /** Los botones de tipo de la barra de filtros (en plural). */
  etiquetasFiltro: { ingresos: string; gastos: string };
  etiquetasTotales: { ingresos: string; gastos: string; balance: string };
}

export const CAJAS: Record<CajaId, CajaConfig> = {
  aportes: {
    id: 'aportes',
    titulo: 'Aportes personales',
    moneda: 'USD',
    conAportante: true,
    etiquetasTipo: { ingreso: 'Aporte', gasto: 'Devolución' },
    etiquetasFiltro: { ingresos: 'Aportes', gastos: 'Devoluciones' },
    etiquetasTotales: { ingresos: 'Aportado', gastos: 'Devuelto', balance: 'Deuda' },
  },
};

export const APORTANTES = ['Maxi', 'Gustavo', 'Nicolás'];
