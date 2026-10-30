import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { campanasApi } from '../../../api/campanas'
import type { Plantilla } from '../../../api/tipos'
import { Aviso, Campo, Selector, Tarjeta } from '../../../components/ui'
import type { PasoProps } from '../CampanaWizardPage'
import PiePaso from './PiePaso'

/** Si la cartera tiene una columna con el mismo nombre que la variable, se propone sola. */
function mapeoInicial(p: Plantilla | undefined, columnas: string[], actual: Record<string, string>) {
  const m: Record<string, string> = {}
  p?.variables.forEach((v) => {
    m[v] = actual[v] && columnas.includes(actual[v]) ? actual[v] : columnas.includes(v) ? v : ''
  })
  return m
}

export default function PasoMensaje({ campana, alGuardar, ir }: PasoProps) {
  const { data: plantillas, isLoading } = useQuery({ queryKey: ['plantillas'], queryFn: campanasApi.plantillas })
  const { data: muestra } = useQuery({ queryKey: ['muestra', campana.id], queryFn: () => campanasApi.muestra(campana.id) })

  const [plantillaId, setPlantillaId] = useState<number | undefined>(campana.plantilla?.id)
  const [mapeo, setMapeo] = useState<Record<string, string>>(
    mapeoInicial(campana.plantilla ?? undefined, campana.columnas, campana.mapeoVariables),
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plantilla = plantillas?.find((p) => p.id === plantillaId)

  const elegirPlantilla = (id: number) => {
    setPlantillaId(id)
    setMapeo(mapeoInicial(plantillas?.find((p) => p.id === id), campana.columnas, mapeo))
  }

  const vistaPrevia = useMemo(() => {
    if (!plantilla) return null
    return plantilla.cuerpo.replace(/\{\{(\w+)\}\}/g, (_, v: string) => {
      const col = mapeo[v]
      return col ? (muestra?.datos[col] || `[${col}]`) : `{{${v}}}`
    })
  }, [plantilla, mapeo, muestra])

  const completo = !!plantilla && plantilla.variables.every((v) => mapeo[v])

  const guardar = async () => {
    if (!plantilla) return
    setGuardando(true)
    setError(null)
    try {
      alGuardar(await campanasApi.actualizarMensaje(campana.id, plantilla.id, mapeo), 5)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Tarjeta>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <h2 className="font-semibold">Plantilla del mensaje</h2>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Campo etiqueta="Plantilla aprobada" htmlFor="plantilla">
            <Selector
              id="plantilla"
              value={plantillaId ?? ''}
              onChange={(e) => elegirPlantilla(Number(e.target.value))}
              disabled={isLoading}
            >
              <option value="" disabled>Elige una plantilla</option>
              {plantillas?.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}{p.descripcion ? ` — ${p.descripcion}` : ''}</option>
              ))}
            </Selector>
          </Campo>

          {plantilla && plantilla.variables.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Variables</h3>
                <p className="text-xs text-tenue">Elige de qué columna de la cartera sale cada dato.</p>
              </div>
              {plantilla.variables.map((v) => (
                <Campo key={v} etiqueta={`{{${v}}}`} htmlFor={`var-${v}`}>
                  <Selector
                    id={`var-${v}`}
                    value={mapeo[v] ?? ''}
                    onChange={(e) => setMapeo({ ...mapeo, [v]: e.target.value })}
                  >
                    <option value="">Elige una columna</option>
                    {campana.columnas.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Selector>
                </Campo>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-semibold">Vista previa</h2>
          <div className="rounded-xl bg-[#e7ded3] p-5">
            {vistaPrevia ? (
              <div className="max-w-sm whitespace-pre-line rounded-lg rounded-tl-none bg-white px-4 py-3 text-sm shadow-sm">
                {vistaPrevia}
              </div>
            ) : (
              <p className="text-sm text-stone-600">Elige una plantilla para ver el mensaje.</p>
            )}
          </div>
          {muestra?.datos && Object.keys(muestra.datos).length > 0 && (
            <p className="mt-2 text-xs text-tenue">Con los datos del primer registro válido de la cartera.</p>
          )}
        </div>
      </div>

      <PiePaso onAnterior={() => ir(3)} onSiguiente={guardar} cargando={guardando} deshabilitado={!completo} />
    </Tarjeta>
  )
}
