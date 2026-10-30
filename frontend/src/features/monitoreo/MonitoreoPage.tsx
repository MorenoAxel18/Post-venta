import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { OBJETIVOS } from '../../api/campanas'
import { monitoreoApi, type FiltrosMonitoreo } from '../../api/monitoreo'
import type { FilaCampanaMonitoreo, MotivoError, PuntoDia } from '../../api/tipos'
import { fechaHora, numero } from '../../api/formato'
import { Aviso, Campo, Encabezado, Entrada, Selector, Tarjeta } from '../../components/ui'
import EstadoBadge from '../../components/EstadoBadge'

// Validados con el script de dataviz (contraste, daltonismo): azul de marca y rojo de fallo
const COLOR_ENVIADOS = '#2f5fe0'
const COLOR_FALLIDOS = '#e5484d'

const porcentaje = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 }).format(n)

/** 'YYYY-MM-DD' -> '30 oct' sin pasar por Date (evita que la zona horaria mueva el día). */
function diaCorto(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(a, m - 1, d)))
}

export default function MonitoreoPage() {
  const [filtros, setFiltros] = useState<FiltrosMonitoreo>({})
  const { data, isLoading, error } = useQuery({
    queryKey: ['monitoreo', 'campanas', filtros],
    queryFn: () => monitoreoApi.campanas(filtros),
    refetchInterval: 30_000, // mismo ritmo que el scheduler de envíos
  })
  const cambiar = (c: Partial<FiltrosMonitoreo>) => setFiltros((f) => ({ ...f, ...c }))
  const r = data?.resumen

  return (
    <>
      <Encabezado titulo="Monitoreo" descripcion="Indicadores de campañas. Se actualiza cada 30 segundos." />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <Campo etiqueta="Desde" htmlFor="desde">
          <Entrada id="desde" type="date" value={filtros.desde ?? data?.desde ?? ''} max={filtros.hasta ?? data?.hasta}
            onChange={(e) => cambiar({ desde: e.target.value || undefined })} />
        </Campo>
        <Campo etiqueta="Hasta" htmlFor="hasta">
          <Entrada id="hasta" type="date" value={filtros.hasta ?? data?.hasta ?? ''} min={filtros.desde ?? data?.desde}
            onChange={(e) => cambiar({ hasta: e.target.value || undefined })} />
        </Campo>
        <Campo etiqueta="Objetivo" htmlFor="objetivo">
          <Selector id="objetivo" value={filtros.objetivo ?? ''} onChange={(e) => cambiar({ objetivo: e.target.value || undefined })}>
            <option value="">Todos</option>
            {OBJETIVOS.map((o) => <option key={o}>{o}</option>)}
          </Selector>
        </Campo>
      </div>

      {error && <Aviso tipo="error">{(error as Error).message}</Aviso>}
      {isLoading && <p className="text-tenue">Cargando indicadores…</p>}

      {data && r && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Indicador titulo="Enviados" valor={numero(r.enviados)} />
            <Indicador titulo="Fallidos" valor={numero(r.fallidos)}
              nota={r.enviados + r.fallidos ? `${porcentaje(r.tasaFallo)} de los intentos` : undefined} />
            <Indicador titulo="En cola" valor={numero(r.pendientes)}
              nota={`${r.campanasActivas} ${r.campanasActivas === 1 ? 'campaña activa' : 'campañas activas'}`} />
            <Indicador titulo="Campañas completadas" valor={numero(r.campanasCompletadas)} nota="en el periodo" />
          </div>

          {data.envioSimulado && (
            <Aviso>
              Entregados y leídos aparecerán cuando se conecte Treble: hoy el envío es simulado y WhatsApp no
              confirma la entrega.
            </Aviso>
          )}

          <Tarjeta>
            <h2 className="font-semibold">Envíos por día</h2>
            <GraficaDias puntos={data.porDia} />
          </Tarjeta>

          <TablaCampanas filas={data.campanas} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Motivos titulo="Errores en la cartera" vacio="Sin registros con error en campañas creadas en el periodo."
              motivos={data.erroresCartera} />
            <Motivos titulo="Motivos de envío fallido" vacio="Sin envíos fallidos en el periodo."
              motivos={data.erroresEnvio} />
          </div>
        </div>
      )}
    </>
  )
}

function Indicador({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <Tarjeta className="p-5">
      <p className="text-sm text-tenue">{titulo}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{valor}</p>
      {nota && <p className="mt-1 text-xs text-tenue">{nota}</p>}
    </Tarjeta>
  )
}

function GraficaDias({ puntos }: { puntos: PuntoDia[] }) {
  const [activo, setActivo] = useState<number | null>(null)
  const maximo = Math.max(1, ...puntos.map((p) => p.enviados + p.fallidos))
  const total = puntos.reduce((s, p) => s + p.enviados + p.fallidos, 0)
  const etiquetas = new Set([0, Math.floor((puntos.length - 1) / 2), puntos.length - 1])
  const p = activo !== null ? puntos[activo] : null

  return (
    <div className="mt-4">
      <div className="mb-3 flex gap-4 text-xs text-tenue" aria-hidden>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: COLOR_ENVIADOS }} />Enviados</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: COLOR_FALLIDOS }} />Fallidos</span>
      </div>

      {total === 0 ? (
        <p className="py-12 text-center text-sm text-tenue">No hubo envíos en este periodo.</p>
      ) : (
        <div className="relative">
          {/* Eje Y de 2.5rem + separación de 0.75rem = 3.25rem; etiquetas y tooltip usan el mismo margen */}
          <div className="flex gap-3">
            <div className="flex h-48 w-10 flex-col justify-between text-right text-xs tabular-nums text-tenue">
              <span>{numero(maximo)}</span>
              <span>0</span>
            </div>
            <div className="relative flex h-48 flex-1 items-end gap-0.5 border-b border-t border-dashed border-linea"
              role="img" aria-label={`Envíos por día: ${numero(total)} intentos en ${puntos.length} días`}
              onMouseLeave={() => setActivo(null)}>
              {puntos.map((d, i) => (
                <div key={d.fecha} className="flex h-full flex-1 flex-col justify-end transition-opacity"
                  style={{ opacity: activo === null || activo === i ? 1 : 0.5 }}
                  onMouseEnter={() => setActivo(i)}>
                  {/* Fallidos arriba, enviados en la base; 2 px de separación y punta redondeada */}
                  {d.fallidos > 0 && (
                    <div className="mb-0.5 rounded-t" style={{ height: `${(d.fallidos / maximo) * 100}%`, minHeight: 2, background: COLOR_FALLIDOS }} />
                  )}
                  {d.enviados > 0 && (
                    <div className={d.fallidos ? '' : 'rounded-t'}
                      style={{ height: `${(d.enviados / maximo) * 100}%`, minHeight: 2, background: COLOR_ENVIADOS }} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex gap-0.5 pl-[3.25rem] text-xs text-tenue">
            {puntos.map((d, i) => (
              <span key={d.fecha} className="flex-1 truncate text-center">{etiquetas.has(i) ? diaCorto(d.fecha) : ''}</span>
            ))}
          </div>

          {p && activo !== null && (
            <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-linea bg-white px-3 py-2 text-xs shadow-md"
              style={{ left: `calc(3.25rem + (100% - 3.25rem) * ${(activo + 0.5) / puntos.length})` }}>
              <p className="font-semibold">{diaCorto(p.fecha)}</p>
              <p>Enviados: <span className="tabular-nums">{numero(p.enviados)}</span></p>
              <p>Fallidos: <span className="tabular-nums">{numero(p.fallidos)}</span></p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TablaCampanas({ filas }: { filas: FilaCampanaMonitoreo[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-linea bg-white">
      <table className="w-full text-left text-sm">
        <caption className="border-b border-linea px-5 py-3 text-left font-semibold">
          Campañas activas o con envíos en el periodo
        </caption>
        <thead className="border-b border-linea bg-slate-50 text-xs font-semibold text-tenue">
          <tr>
            <th className="px-5 py-3">Campaña</th>
            <th className="px-5 py-3">Estado</th>
            <th className="px-5 py-3">Inicio de envío</th>
            <th className="px-5 py-3">Avance</th>
            <th className="px-5 py-3 text-right">Enviados</th>
            <th className="px-5 py-3 text-right">Fallidos</th>
            <th className="px-5 py-3 text-right">En cola</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-linea">
          {filas.length === 0 && (
            <tr><td colSpan={7} className="px-5 py-10 text-center text-tenue">No hay campañas en este periodo.</td></tr>
          )}
          {filas.map((c) => {
            const procesados = c.enviados + c.fallidos + c.cancelados
            const avance = c.destinatarios ? procesados / c.destinatarios : 0
            return (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <Link to={`/campanas/${c.id}`} className="font-medium hover:text-marca-600">{c.nombre}</Link>
                  <p className="text-xs text-tenue">{c.objetivo}</p>
                </td>
                <td className="px-5 py-3.5"><EstadoBadge estado={c.estado} /></td>
                <td className="px-5 py-3.5 text-tenue">{fechaHora(c.fechaInicioEnvio)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${avance * 100}%`, background: COLOR_ENVIADOS }} />
                    </div>
                    <span className="text-xs tabular-nums text-tenue">{porcentaje(avance)}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums">{numero(c.enviados)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums">{numero(c.fallidos)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums">{numero(c.pendientes)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Motivos({ titulo, vacio, motivos }: { titulo: string; vacio: string; motivos: MotivoError[] }) {
  const maximo = Math.max(1, ...motivos.map((m) => m.total))
  return (
    <Tarjeta>
      <h2 className="mb-4 font-semibold">{titulo}</h2>
      {motivos.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-tenue"><Info className="size-4" aria-hidden />{vacio}</p>
      ) : (
        <ul className="space-y-3">
          {motivos.map((m) => (
            <li key={m.motivo}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span>{m.motivo}</span>
                <span className="tabular-nums text-tenue">{numero(m.total)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-slate-400" style={{ width: `${(m.total / maximo) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  )
}
