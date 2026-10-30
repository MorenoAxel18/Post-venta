import { useState } from 'react'
import { CalendarClock, Zap } from 'lucide-react'
import { campanasApi } from '../../../api/campanas'
import { Aviso, Campo, Entrada, Tarjeta } from '../../../components/ui'
import type { PasoProps } from '../CampanaWizardPage'
import PiePaso from './PiePaso'

const ZONA = 'America/Mexico_City'

/** Convierte un ISO a "YYYY-MM-DD" y "HH:mm" en hora del centro de México. */
function partesLocales(iso: string | null) {
  if (!iso) return { dia: '', hora: '' }
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? ''
  return { dia: `${get('year')}-${get('month')}-${get('day')}`, hora: `${get('hour')}:${get('minute')}` }
}

/**
 * Interpreta día y hora como hora del centro de México (UTC-6, sin horario de verano desde 2022)
 * y la devuelve en ISO UTC para el backend.
 */
function aIso(dia: string, hora: string) {
  return new Date(`${dia}T${hora}:00-06:00`).toISOString()
}

export default function PasoProgramacion({ campana, alGuardar, ir }: PasoProps) {
  const inicial = partesLocales(campana.fechaProgramada)
  const [inmediata, setInmediata] = useState(campana.ejecucionInmediata)
  const [dia, setDia] = useState(inicial.dia)
  const [hora, setHora] = useState(inicial.hora || '10:00')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const guardar = async () => {
    setError(null)
    if (!inmediata && !dia) {
      setError('Elige la fecha de envío.')
      return
    }
    setGuardando(true)
    try {
      alGuardar(await campanasApi.actualizarProgramacion(campana.id, inmediata, inmediata ? null : aIso(dia, hora)), 6)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  const opcion = (activa: boolean) =>
    `flex w-full gap-3 rounded-xl border p-5 text-left transition-colors ${
      activa ? 'border-marca-500 bg-marca-50/60 ring-2 ring-marca-100' : 'border-linea hover:border-marca-200'
    }`

  return (
    <Tarjeta className="space-y-5">
      <h2 className="font-semibold">¿Cuándo se envía?</h2>
      {error && <Aviso tipo="error">{error}</Aviso>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className={opcion(!inmediata)}>
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-marca-600" aria-hidden />
          <div className="flex-1 space-y-4">
            <label className="flex cursor-pointer items-center gap-2 font-semibold">
              <input type="radio" name="modo" checked={!inmediata} onChange={() => setInmediata(false)} />
              Programar fecha y hora
            </label>
            {!inmediata && (
              <div className="grid grid-cols-2 gap-3">
                <Campo etiqueta="Fecha" htmlFor="dia">
                  <Entrada id="dia" type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
                </Campo>
                <Campo etiqueta="Hora (centro de México)" htmlFor="hora">
                  <Entrada id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
                </Campo>
              </div>
            )}
          </div>
        </div>

        <label className={`${opcion(inmediata)} cursor-pointer`}>
          <Zap className="mt-0.5 size-5 shrink-0 text-marca-600" aria-hidden />
          <div>
            <span className="flex items-center gap-2 font-semibold">
              <input type="radio" name="modo" checked={inmediata} onChange={() => setInmediata(true)} />
              Enviar al aprobarse
            </span>
            <p className="mt-1 text-sm text-tenue">El envío empieza en cuanto un aprobador autorice la campaña.</p>
          </div>
        </label>
      </div>

      <PiePaso onAnterior={() => ir(4)} onSiguiente={guardar} cargando={guardando} />
    </Tarjeta>
  )
}
