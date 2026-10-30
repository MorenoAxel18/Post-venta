import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { campanasApi } from '../../../api/campanas'
import { fechaHora, numero } from '../../../api/formato'
import { Aviso, Tarjeta } from '../../../components/ui'
import type { PasoProps } from '../CampanaWizardPage'
import PiePaso from './PiePaso'

export default function PasoConfirmacion({ campana, ir }: PasoProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filas: [string, string][] = [
    ['Nombre', campana.nombre],
    ['Objetivo', campana.objetivo],
    ['Archivo', campana.archivoNombre ?? '—'],
    ['Destinatarios', `${numero(campana.registrosValidos)} (se omiten ${numero(campana.registrosError)} con error)`],
    ['Plantilla', campana.plantilla?.nombre ?? '—'],
    ['Envío', campana.ejecucionInmediata ? 'Al aprobarse' : fechaHora(campana.fechaProgramada)],
  ]

  const enviar = async () => {
    setEnviando(true)
    setError(null)
    try {
      const c = await campanasApi.enviarAprobacion(campana.id)
      qc.setQueryData(['campana', c.id], c)
      qc.invalidateQueries({ queryKey: ['campanas'] })
      navigate(`/campanas/${c.id}`)
    } catch (e) {
      setError((e as Error).message)
      setEnviando(false)
    }
  }

  return (
    <Tarjeta className="space-y-5">
      <h2 className="font-semibold">Revisa y envía a aprobación</h2>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <dl className="divide-y divide-linea rounded-lg border border-linea">
        {filas.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[180px_1fr] gap-4 px-4 py-3 text-sm">
            <dt className="text-tenue">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <Aviso>
        Otra persona con permiso de aprobación debe autorizar la campaña. Hasta entonces no se envía ningún mensaje.
      </Aviso>
      <PiePaso onAnterior={() => ir(5)} onSiguiente={enviar} cargando={enviando} textoSiguiente="Enviar a aprobación" />
    </Tarjeta>
  )
}
