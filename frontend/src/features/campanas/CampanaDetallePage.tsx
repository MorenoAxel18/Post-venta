import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Check, Pause, Pencil, Play, Send, X } from 'lucide-react'
import { campanasApi } from '../../api/campanas'
import type { CampanaDetalle, EstadoEnvio } from '../../api/tipos'
import { fechaHora, numero } from '../../api/formato'
import { AreaTexto, Aviso, Boton, Encabezado, Tarjeta } from '../../components/ui'
import EstadoBadge from '../../components/EstadoBadge'

const ENVIOS: { estado: EstadoEnvio; etiqueta: string; color: string }[] = [
  { estado: 'ENVIADO', etiqueta: 'Enviados', color: 'bg-marca-500' },
  { estado: 'ENTREGADO', etiqueta: 'Entregados', color: 'bg-sky-500' },
  { estado: 'LEIDO', etiqueta: 'Leídos', color: 'bg-emerald-500' },
  { estado: 'FALLIDO', etiqueta: 'Fallidos', color: 'bg-red-500' },
  { estado: 'PENDIENTE', etiqueta: 'Pendientes', color: 'bg-slate-300' },
  { estado: 'CANCELADO', etiqueta: 'Cancelados', color: 'bg-slate-400' },
]

export default function CampanaDetallePage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [rechazando, setRechazando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const { data: c, isLoading, error } = useQuery({
    queryKey: ['campana', id],
    queryFn: () => campanasApi.detalle(id),
    // Mientras se envía, se actualiza sola cada 10 s
    refetchInterval: (q) =>
      q.state.data && ['PROGRAMADA', 'EN_EJECUCION'].includes(q.state.data.estado) ? 10_000 : false,
  })

  const accion = useMutation({
    mutationFn: (f: () => Promise<CampanaDetalle>) => f(),
    onSuccess: (nueva) => {
      qc.setQueryData(['campana', id], nueva)
      qc.invalidateQueries({ queryKey: ['campanas'] })
      setRechazando(false)
      setMotivo('')
    },
  })

  if (isLoading) return <p className="text-tenue">Cargando campaña…</p>
  if (error || !c) return <Aviso tipo="error">{(error as Error)?.message ?? 'No se encontró la campaña.'}</Aviso>

  const a = c.acciones
  const ejecutar = (f: () => Promise<CampanaDetalle>) => accion.mutate(f)
  const totalEnvios = Object.values(c.envios).reduce((s, n) => s + (n ?? 0), 0)

  return (
    <>
      <nav className="mb-2 text-sm text-tenue" aria-label="Ruta">
        <Link to="/campanas" className="hover:text-marca-600">Campañas</Link>
        <span className="mx-2">/</span>
        <span>{c.nombre}</span>
      </nav>

      <Encabezado
        titulo={c.nombre}
        descripcion={c.objetivo}
        acciones={
          <>
            {a.editar && (
              <Boton variante="secundario" onClick={() => navigate(`/campanas/${c.id}/editar?paso=1`)}>
                <Pencil className="size-4" aria-hidden />Editar
              </Boton>
            )}
            {a.enviarAprobacion && (
              <Boton onClick={() => navigate(`/campanas/${c.id}/editar?paso=6`)}>
                <Send className="size-4" aria-hidden />Revisar y enviar a aprobación
              </Boton>
            )}
            {a.pausar && (
              <Boton variante="secundario" onClick={() => ejecutar(() => campanasApi.pausar(c.id))}>
                <Pause className="size-4" aria-hidden />Pausar
              </Boton>
            )}
            {a.reanudar && (
              <Boton onClick={() => ejecutar(() => campanasApi.reanudar(c.id))}>
                <Play className="size-4" aria-hidden />Reanudar
              </Boton>
            )}
            {a.cancelar && (
              <Boton
                variante="peligro"
                onClick={() => {
                  if (confirm('¿Cancelar la campaña? Los mensajes pendientes ya no se enviarán.')) {
                    ejecutar(() => campanasApi.cancelar(c.id))
                  }
                }}
              >
                <Ban className="size-4" aria-hidden />Cancelar campaña
              </Boton>
            )}
          </>
        }
      />

      <div className="mb-6 flex items-center gap-3">
        <EstadoBadge estado={c.estado} />
        {c.estado === 'EN_EJECUCION' && <span className="text-sm text-tenue">Enviando por lotes…</span>}
      </div>

      {accion.error && <div className="mb-4"><Aviso tipo="error">{(accion.error as Error).message}</Aviso></div>}
      {c.motivoRechazo && c.estado === 'BORRADOR' && (
        <div className="mb-4"><Aviso tipo="error"><b>Rechazada:</b> {c.motivoRechazo}</Aviso></div>
      )}

      {c.estado === 'PENDIENTE_APROBACION' && (
        <Tarjeta className="mb-6 border-amber-200 bg-amber-50/40">
          <h2 className="font-semibold">Pendiente de aprobación</h2>
          {a.motivoNoAprobar && <p className="mt-1 text-sm text-tenue">{a.motivoNoAprobar}</p>}
          {(a.aprobar || a.rechazar) && !rechazando && (
            <div className="mt-4 flex gap-2">
              {a.aprobar && (
                <Boton variante="exito" cargando={accion.isPending} onClick={() => ejecutar(() => campanasApi.aprobar(c.id))}>
                  <Check className="size-4" aria-hidden />Aprobar
                </Boton>
              )}
              {a.rechazar && (
                <Boton variante="peligro" onClick={() => setRechazando(true)}>
                  <X className="size-4" aria-hidden />Rechazar
                </Boton>
              )}
            </div>
          )}
          {rechazando && (
            <div className="mt-4 space-y-3">
              <label htmlFor="motivo" className="block text-sm font-medium">Motivo del rechazo</label>
              <AreaTexto id="motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)}
                placeholder="Explica qué se debe corregir" />
              <div className="flex gap-2">
                <Boton variante="peligro" disabled={!motivo.trim()} cargando={accion.isPending}
                  onClick={() => ejecutar(() => campanasApi.rechazar(c.id, motivo.trim()))}>
                  Rechazar campaña
                </Boton>
                <Boton variante="secundario" onClick={() => setRechazando(false)}>Volver</Boton>
              </div>
            </div>
          )}
        </Tarjeta>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {totalEnvios > 0 && (
            <Tarjeta>
              <h2 className="mb-4 font-semibold">Avance de envío</h2>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                {ENVIOS.map(({ estado, color }) => {
                  const n = c.envios[estado] ?? 0
                  return n > 0 ? <div key={estado} className={color} style={{ width: `${(n / totalEnvios) * 100}%` }} /> : null
                })}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ENVIOS.filter(({ estado }) => (c.envios[estado] ?? 0) > 0).map(({ estado, etiqueta, color }) => (
                  <div key={estado} className="flex items-center gap-2 text-sm">
                    <span className={`size-2.5 rounded-full ${color}`} aria-hidden />
                    <dt className="text-tenue">{etiqueta}</dt>
                    <dd className="ml-auto font-semibold tabular-nums">{numero(c.envios[estado] ?? 0)}</dd>
                  </div>
                ))}
              </dl>
            </Tarjeta>
          )}

          <Tarjeta>
            <h2 className="mb-3 font-semibold">Mensaje</h2>
            {c.plantilla ? (
              <>
                <p className="mb-3 text-sm text-tenue">Plantilla <b className="text-tinta">{c.plantilla.nombre}</b></p>
                <div className="rounded-xl bg-[#e7ded3] p-4">
                  <div className="max-w-md whitespace-pre-line rounded-lg rounded-tl-none bg-white px-4 py-3 text-sm">
                    {c.plantilla.cuerpo}
                  </div>
                </div>
                {Object.keys(c.mapeoVariables).length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {Object.entries(c.mapeoVariables).map(([v, col]) => (
                      <li key={v}><code className="text-marca-700">{`{{${v}}}`}</code> ← columna <b>{col}</b></li>
                    ))}
                  </ul>
                )}
              </>
            ) : <p className="text-sm text-tenue">Todavía no se elige plantilla.</p>}
          </Tarjeta>
        </div>

        <Tarjeta>
          <h2 className="mb-3 font-semibold">Resumen</h2>
          <dl className="space-y-3 text-sm">
            {([
              ['Destinatarios válidos', numero(c.registrosValidos)],
              ['Registros con error', numero(c.registrosError)],
              ['Archivo', c.archivoNombre ?? '—'],
              ['Envío', c.ejecucionInmediata && !c.fechaProgramada ? 'Al aprobarse' : fechaHora(c.fechaProgramada)],
              ['Inicio de envío', fechaHora(c.fechaInicioEnvio)],
              ['Fin de envío', fechaHora(c.fechaFinEnvio)],
              ['Creada por', c.creadaPor ?? '—'],
              ['Aprobada por', c.aprobadaPor ? `${c.aprobadaPor} · ${fechaHora(c.fechaAprobacion)}` : '—'],
              ['Creada', fechaHora(c.creada)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-tenue">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {c.descripcion && <p className="mt-4 border-t border-linea pt-4 text-sm text-tenue">{c.descripcion}</p>}
        </Tarjeta>
      </div>
    </>
  )
}
