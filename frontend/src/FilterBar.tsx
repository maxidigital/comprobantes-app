import { useEffect, useRef, useState } from 'react';
import {
  dateToIso,
  formatFechaInput,
  fechaToIso,
  isoToDisplay,
  rangoAnio,
  rangoEsteAnio,
  rangoEsteMes,
  rangoMes,
  rangoMesPasado,
  todayDisplay,
} from './fecha';
import { ChartIcon, MegaphoneIcon, SparkleIcon } from './icons';
import type { FiltroTipo } from './types';

const MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Las opciones del panel "Filtros" con un checkbox cada una: los bienes en la sucesión, los aportantes en Aportes. */
export interface FiltroCategorias {
  opciones: string[];
  seleccionadas: Set<string>;
  onToggle: (opcion: string) => void;
  color?: (opcion: string) => string;
}

/** Barra de filtros de cada caja. Lo que una caja no tiene (comprobantes pendientes, avisos, bienes, IA) no se pasa y no se muestra. */
interface Props {
  filtroTipo: FiltroTipo;
  onFiltroTipoChange: (tipo: FiltroTipo) => void;
  etiquetasTipo?: { ingresos: string; gastos: string };
  /** Solo en las cajas con comprobantes. */
  pendientes?: { solo: boolean; onChange: (value: boolean) => void; count: number };
  categorias?: FiltroCategorias;
  fechaDesde: string | null;
  fechaHasta: string | null;
  onFechaRangeChange: (desde: string | null, hasta: string | null) => void;
  aniosConDatos: number[];
  /** Solo en las cajas con avisos. */
  avisos?: { mostrar: boolean; onToggle: () => void };
  /** Informes y la IA van acá (y no en el menú) porque son de la caja que se está viendo. */
  onInformes: () => void;
  /** Solo en Alquileres: la IA todavía no lee las otras cajas. */
  onPreguntarIA?: () => void;
}

export default function FilterBar({
  filtroTipo,
  onFiltroTipoChange,
  etiquetasTipo = { ingresos: 'Ingresos', gastos: 'Egresos' },
  pendientes,
  categorias,
  fechaDesde,
  fechaHasta,
  onFechaRangeChange,
  aniosConDatos,
  avisos,
  onInformes,
  onPreguntarIA,
}: Props) {
  const [showFiltros, setShowFiltros] = useState(false);
  const [showRangos, setShowRangos] = useState(false);
  const [showRangoPersonalizado, setShowRangoPersonalizado] = useState(false);
  const filtrosRef = useRef<HTMLDivElement>(null);
  const rangosRef = useRef<HTMLDivElement>(null);

  const [desdeTexto, setDesdeTexto] = useState(fechaDesde ? isoToDisplay(fechaDesde) : '');
  const [hastaTexto, setHastaTexto] = useState(fechaHasta ? isoToDisplay(fechaHasta) : '');

  useEffect(() => setDesdeTexto(fechaDesde ? isoToDisplay(fechaDesde) : ''), [fechaDesde]);
  useEffect(() => setHastaTexto(fechaHasta ? isoToDisplay(fechaHasta) : ''), [fechaHasta]);

  useEffect(() => {
    if (!showFiltros) return;

    function handleOutside(e: MouseEvent) {
      if (filtrosRef.current && !filtrosRef.current.contains(e.target as Node)) {
        setShowFiltros(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowFiltros(false);
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showFiltros]);

  useEffect(() => {
    if (!showRangos) return;

    function handleOutside(e: MouseEvent) {
      if (rangosRef.current && !rangosRef.current.contains(e.target as Node)) {
        setShowRangos(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowRangos(false);
    }

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showRangos]);

  function esPresetActivo([desde, hasta]: [string, string]): boolean {
    return fechaDesde === desde && fechaHasta === hasta;
  }

  function togglePreset(rango: [string, string]) {
    if (esPresetActivo(rango)) {
      onFechaRangeChange(null, null);
    } else {
      onFechaRangeChange(rango[0], rango[1]);
    }
  }

  /** Año sobre el que actúan los chips de mes: si ya hay un año completo
   * seleccionado (p.ej. se tocó el chip "2022"), los meses se acotan a
   * ese año; si no, al año actual. */
  function anioActivoParaMeses(): number {
    if (fechaDesde && fechaHasta) {
      const anio = Number(fechaDesde.slice(0, 4));
      if (esPresetActivo(rangoAnio(anio))) return anio;
    }
    return new Date().getFullYear();
  }

  function handleDesdeTextoChange(raw: string) {
    const formatted = formatFechaInput(raw);
    setDesdeTexto(formatted);
    if (formatted === '') {
      onFechaRangeChange(null, fechaHasta);
      return;
    }
    const iso = fechaToIso(formatted);
    if (iso) onFechaRangeChange(iso, fechaHasta);
  }

  function handleHastaTextoChange(raw: string) {
    const formatted = formatFechaInput(raw);
    setHastaTexto(formatted);
    if (formatted === '') {
      onFechaRangeChange(fechaDesde, null);
      return;
    }
    const iso = fechaToIso(formatted);
    if (iso) onFechaRangeChange(fechaDesde, iso);
  }

  function handleHastaHoy() {
    setHastaTexto(todayDisplay());
    onFechaRangeChange(fechaDesde, dateToIso(new Date()));
  }

  return (
    <div className="filter-bar">
      <div className="segmented">
        <button
          type="button"
          className={filtroTipo === 'INGRESO' ? 'active' : ''}
          onClick={() => onFiltroTipoChange(filtroTipo === 'INGRESO' ? 'TODOS' : 'INGRESO')}
          aria-pressed={filtroTipo === 'INGRESO'}
        >
          {etiquetasTipo.ingresos}
        </button>
        <button
          type="button"
          className={filtroTipo === 'GASTO' ? 'active' : ''}
          onClick={() => onFiltroTipoChange(filtroTipo === 'GASTO' ? 'TODOS' : 'GASTO')}
          aria-pressed={filtroTipo === 'GASTO'}
        >
          {etiquetasTipo.gastos}
        </button>
      </div>
      {(pendientes || categorias) && (
        <div className="dropdown-wrapper" ref={filtrosRef}>
          <button
            type="button"
            className={`chip chip-toggle ${pendientes?.solo || (categorias?.seleccionadas.size ?? 0) > 0 ? 'active' : ''}`}
            onClick={() => setShowFiltros((v) => !v)}
            aria-expanded={showFiltros}
          >
            Filtros
          </button>
          {showFiltros && (
            <div className="dropdown-panel dropdown-panel--centered">
              {pendientes && (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={pendientes.solo}
                    onChange={(e) => pendientes.onChange(e.target.checked)}
                  />
                  Con comprobante pendiente{pendientes.count > 0 ? ` (${pendientes.count})` : ''}
                </label>
              )}

              {pendientes && categorias && <div className="dropdown-panel-separator" />}

              {categorias?.opciones.map((opcion) => (
                <label className="checkbox-row" key={opcion}>
                  <input
                    type="checkbox"
                    checked={categorias.seleccionadas.has(opcion)}
                    onChange={() => categorias.onToggle(opcion)}
                  />
                  <span
                    className="bien-label"
                    style={categorias.color ? { color: categorias.color(opcion) } : undefined}
                  >
                    {opcion}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="dropdown-wrapper" ref={rangosRef}>
        <button
          type="button"
          className={`chip chip-toggle ${fechaDesde || fechaHasta ? 'active' : ''}`}
          onClick={() => setShowRangos((v) => !v)}
          aria-expanded={showRangos}
        >
          Rangos
        </button>
        {showRangos && (
          <div className="dropdown-panel dropdown-panel--centered dropdown-panel--ancho">
            <div className="chip-list filtro-fechas-presets">
              <button
                type="button"
                className={`chip chip-toggle ${esPresetActivo(rangoEsteMes()) ? 'active' : ''}`}
                onClick={() => togglePreset(rangoEsteMes())}
              >
                Este mes
              </button>
              <button
                type="button"
                className={`chip chip-toggle ${esPresetActivo(rangoMesPasado()) ? 'active' : ''}`}
                onClick={() => togglePreset(rangoMesPasado())}
              >
                Mes pasado
              </button>
              <button
                type="button"
                className={`chip chip-toggle ${esPresetActivo(rangoEsteAnio()) ? 'active' : ''}`}
                onClick={() => togglePreset(rangoEsteAnio())}
              >
                Este año
              </button>
            </div>

            <div className="dropdown-panel-separator" />

            <div className="chip-list filtro-fechas-presets">
              {aniosConDatos.map((anio) => (
                <button
                  key={anio}
                  type="button"
                  className={`chip chip-toggle ${esPresetActivo(rangoAnio(anio)) ? 'active' : ''}`}
                  onClick={() => togglePreset(rangoAnio(anio))}
                >
                  {anio}
                </button>
              ))}
            </div>

            <div className="chip-list filtro-fechas-presets">
              {MESES.map((mes) => (
                <button
                  key={mes}
                  type="button"
                  className={`chip chip-toggle ${esPresetActivo(rangoMes(anioActivoParaMeses(), mes)) ? 'active' : ''}`}
                  onClick={() => togglePreset(rangoMes(anioActivoParaMeses(), mes))}
                >
                  {mes}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="dropdown-panel-toggle"
              onClick={() => setShowRangoPersonalizado((v) => !v)}
              aria-expanded={showRangoPersonalizado}
            >
              Rango personalizado {showRangoPersonalizado ? '▾' : '▸'}
            </button>

            {showRangoPersonalizado && (
              <div className="filtro-fechas-custom">
                <label>
                  Desde
                  <input
                    type="text"
                    className="input"
                    inputMode="numeric"
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    value={desdeTexto}
                    onChange={(e) => handleDesdeTextoChange(e.target.value)}
                  />
                </label>
                <label>
                  Hasta
                  <div className="filtro-fecha-hasta-row">
                    <input
                      type="text"
                      className="input"
                      inputMode="numeric"
                      placeholder="dd/mm/aaaa"
                      maxLength={10}
                      value={hastaTexto}
                      onChange={(e) => handleHastaTextoChange(e.target.value)}
                    />
                    <button type="button" className="chip chip-toggle" onClick={handleHastaHoy}>
                      Hoy
                    </button>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
      {avisos && (
        <button
          type="button"
          className={`chip chip-toggle chip-icon ${!avisos.mostrar ? 'active' : ''}`}
          onClick={avisos.onToggle}
          aria-pressed={!avisos.mostrar}
          aria-label={avisos.mostrar ? 'Ocultar avisos' : 'Mostrar avisos'}
          title={avisos.mostrar ? 'Ocultar avisos' : 'Mostrar avisos'}
        >
          <MegaphoneIcon />
        </button>
      )}
      <button
        type="button"
        className="chip chip-toggle chip-icon"
        onClick={onInformes}
        aria-label="Informes"
        title="Informes"
      >
        <ChartIcon />
      </button>
      {onPreguntarIA && (
        <button
          type="button"
          className="chip chip-toggle chip-icon"
          onClick={onPreguntarIA}
          aria-label="Preguntale a la IA"
          title="Preguntale a la IA"
        >
          <SparkleIcon />
        </button>
      )}
    </div>
  );
}
