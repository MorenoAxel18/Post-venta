import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { PlantillaAdmin } from '../../api/tipos'
import { AreaTexto, Aviso, Boton, Campo, Entrada, Tarjeta } from '../../components/ui'
import { Activo } from './comun'

const VARIABLE = /\{\{(\w+)\}\}/g

export default function PlantillasTab() {
  const [editando, setEditando] = useState<PlantillaAdmin | 'nueva' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const plantillas = useQuery({ queryKey: ['admin', 'plantillas'], queryFn: adminApi.plantillas })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-tenue">
          Deben coincidir con las plantillas aprobadas en Treble / WhatsApp. Las inactivas no aparecen al crear campañas.
        </p>
        <Boton onClick={() => { setAviso(null); setEditando('nueva') }}>
          <Plus className="size-4" aria-hidden />Nueva plantilla
        </Boton>
      </div>

      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      {plantillas.error && <Aviso tipo="error">{(plantillas.error as Error).message}</Aviso>}

      {editando && (
        <FormularioPlantilla
          key={editando === 'nueva' ? 'nueva' : editando.id}
          plantilla={editando === 'nueva' ? undefined : editando}
          alTerminar={(m) => { setEditando(null); setAviso(m) }}
        />
      )}

      {plantillas.isLoading && <p className="text-tenue">Cargando plantillas…</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {plantillas.data?.map((p) => (
          <Tarjeta key={p.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-mono text-sm font-semibold">{p.nombre}</h3>
                {p.descripcion && <p className="text-sm text-tenue">{p.descripcion}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {p.enUso && <Activo activo si="En uso" />}
                <Activo activo={p.activa} si="Activa" no="Inactiva" />
                <Boton variante="fantasma" className="px-2.5" onClick={() => { setAviso(null); setEditando(p) }}
                  aria-label={`Editar plantilla ${p.nombre}`}>
                  <Pencil className="size-4" aria-hidden />
                </Boton>
              </div>
            </div>
            <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm">{p.cuerpo}</p>
            {p.variables.length > 0 && (
              <p className="text-xs text-tenue">Variables: {p.variables.join(', ')}</p>
            )}
          </Tarjeta>
        ))}
      </div>
    </div>
  )
}

function FormularioPlantilla({ plantilla, alTerminar }: {
  plantilla?: PlantillaAdmin
  alTerminar: (mensaje: string | null) => void
}) {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState(plantilla?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(plantilla?.descripcion ?? '')
  const [cuerpo, setCuerpo] = useState(plantilla?.cuerpo ?? '')
  const [activa, setActiva] = useState(plantilla?.activa ?? true)
  const [faltan, setFaltan] = useState(false)
  const bloqueada = plantilla?.enUso ?? false
  const variables = [...new Set([...cuerpo.matchAll(VARIABLE)].map((m) => m[1]))]

  const guardar = useMutation({
    mutationFn: () => {
      const d = { nombre, descripcion: descripcion.trim() || null, cuerpo, activa }
      return plantilla ? adminApi.actualizarPlantilla(plantilla.id, d) : adminApi.crearPlantilla(d)
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['admin', 'plantillas'] })
      qc.invalidateQueries({ queryKey: ['plantillas'] })
      alTerminar(plantilla ? `Se guardó la plantilla ${p.nombre}.` : `Se creó la plantilla ${p.nombre}.`)
    },
  })

  return (
    <form noValidate onSubmit={(e) => {
      e.preventDefault()
      if (!nombre || !cuerpo.trim()) return setFaltan(true)
      guardar.mutate()
    }}>
      <Tarjeta className="space-y-5">
        <h2 className="font-semibold">{plantilla ? `Editar ${plantilla.nombre}` : 'Nueva plantilla'}</h2>
        {guardar.error && <Aviso tipo="error">{(guardar.error as Error).message}</Aviso>}
        {bloqueada && (
          <Aviso>Una campaña en aprobación o en envío usa esta plantilla: solo puedes cambiar la descripción o desactivarla.</Aviso>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          <Campo etiqueta="Nombre en Treble" htmlFor="nombre-plantilla" ayuda="Minúsculas, números y guion bajo."
            error={faltan && !nombre ? 'Escribe el nombre' : undefined}>
            <Entrada id="nombre-plantilla" className="font-mono" placeholder="fc_postventa_aviso_v1" value={nombre}
              readOnly={bloqueada} maxLength={120}
              onChange={(e) => setNombre(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
          </Campo>
          <Campo etiqueta="Descripción (opcional)" htmlFor="descripcion-plantilla">
            <Entrada id="descripcion-plantilla" value={descripcion} maxLength={200}
              onChange={(e) => setDescripcion(e.target.value)} />
          </Campo>
        </div>
        <Campo etiqueta="Texto del mensaje" htmlFor="cuerpo"
          ayuda={variables.length ? `Variables detectadas: ${variables.join(', ')}` : 'Usa {{variable}} para los datos de la cartera.'}
          error={faltan && !cuerpo.trim() ? 'Escribe el texto' : undefined}>
          <AreaTexto id="cuerpo" rows={6} value={cuerpo} readOnly={bloqueada} maxLength={1024}
            onChange={(e) => setCuerpo(e.target.value)} />
        </Campo>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-marca-600" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
          Activa (se puede elegir al crear campañas)
        </label>
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={() => alTerminar(null)}>Cancelar</Boton>
          <Boton type="submit" cargando={guardar.isPending}>{plantilla ? 'Guardar cambios' : 'Crear plantilla'}</Boton>
        </div>
      </Tarjeta>
    </form>
  )
}
