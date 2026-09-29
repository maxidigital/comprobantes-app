import type { Moneda } from './format';
import type { CajaId } from './types';

/**
 * Las dos cajas que solo ve ADMIN, cada una en su propia pestaña de la
 * planilla e independientes de Movimientos (la caja de los alquileres):
 * - Remodelación Iriondo: los gastos de la obra, en pesos.
 * - Aportes personales: lo que cada heredero pone de su bolsillo para la
 *   obra, en dólares para que la inflación no licúe la deuda. INGRESO =
 *   aporta, GASTO = se le devuelve; el saldo es lo que se le debe.
 */
export interface CajaConfig {
  id: CajaId;
  titulo: string;
  tituloCorto: string;
  moneda: Moneda;
  conAportante: boolean;
  etiquetasTipo: { ingreso: string; gasto: string };
  etiquetasTotales: { ingresos: string; gastos: string; balance: string };
}

export const CAJAS: Record<CajaId, CajaConfig> = {
  remodelacion: {
    id: 'remodelacion',
    titulo: 'Remodelación Iriondo',
    tituloCorto: 'Remodelación',
    moneda: 'ARS',
    conAportante: false,
    etiquetasTipo: { ingreso: 'Ingreso', gasto: 'Egreso' },
    etiquetasTotales: { ingresos: 'Ingresos', gastos: 'Egresos', balance: 'Balance' },
  },
  aportes: {
    id: 'aportes',
    titulo: 'Aportes personales',
    tituloCorto: 'Aportes',
    moneda: 'USD',
    conAportante: true,
    etiquetasTipo: { ingreso: 'Aporte', gasto: 'Devolución' },
    etiquetasTotales: { ingresos: 'Aportado', gastos: 'Devuelto', balance: 'Deuda' },
  },
};

export const APORTANTES = ['Maxi', 'Gustavo', 'Nicolás'];
