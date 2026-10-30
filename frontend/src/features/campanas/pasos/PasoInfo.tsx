import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { campanasApi, OBJETIVOS } from '../../../api/campanas'
import type { CampanaDetalle } from '../../../api/tipos'
import { AreaTexto, Aviso, Campo, Entrada, Selector, Tarjeta } from '../../../components/ui'
import PiePaso from './PiePaso'

const esquema = z.object({
  nombre: z.string().trim().min(3, 'Escribe un nombre de al menos 3 caracteres').max(150),
  objetivo: z.string().min(1, 'Elige un objetivo'),
  descripcion: z.string().max(500, 'Máximo 500 caracteres').optional(),
})
type Datos = z.infer<typeof esquema>

export default function PasoInfo({ campana, alGuardar }: {
  campana?: CampanaDetalle
  alGuardar: (c: CampanaDetalle, siguiente: number) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: campana?.nombre ?? '',
      objetivo: campana?.objetivo ?? '',
      descripcion: campana?.descripcion ?? '',
    },
  })

  const guardar = async (d: Datos) => {
    setError(null)
    try {
      const c = campana ? await campanasApi.actualizarInfo(campana.id, d) : await campanasApi.crear(d)
      alGuardar(c, 2)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit(guardar)} noValidate>
      <Tarjeta className="space-y-5">
        <h2 className="font-semibold">Información de la campaña</h2>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <div className="grid gap-5 md:grid-cols-2">
          <Campo etiqueta="Nombre" htmlFor="nombre" error={formState.errors.nombre?.message}>
            <Entrada id="nombre" placeholder="Recordatorio primer pago – Octubre 2026" {...register('nombre')} />
          </Campo>
          <Campo etiqueta="Objetivo" htmlFor="objetivo" error={formState.errors.objetivo?.message}>
            <Selector id="objetivo" {...register('objetivo')}>
              <option value="">Elige un objetivo</option>
              {OBJETIVOS.map((o) => <option key={o}>{o}</option>)}
            </Selector>
          </Campo>
        </div>
        <Campo etiqueta="Descripción (opcional)" htmlFor="descripcion" error={formState.errors.descripcion?.message}>
          <AreaTexto id="descripcion" rows={3} {...register('descripcion')} />
        </Campo>
        <Aviso>
          Las campañas solo pueden usar plantillas aprobadas por WhatsApp. Los mensajes libres se envían desde
          Atención humana cuando el cliente responde.
        </Aviso>
        <PiePaso tipoSiguiente="submit" cargando={formState.isSubmitting} />
      </Tarjeta>
    </form>
  )
}
