import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { campanasApi } from '../../api/campanas'
import type { CampanaDetalle } from '../../api/tipos'
import { Aviso, Encabezado } from '../../components/ui'
import Pasos from './Pasos'
import PasoInfo from './pasos/PasoInfo'
import PasoCartera from './pasos/PasoCartera'
import PasoValidacion from './pasos/PasoValidacion'
import PasoMensaje from './pasos/PasoMensaje'
import PasoProgramacion from './pasos/PasoProgramacion'
import PasoConfirmacion from './pasos/PasoConfirmacion'

/** Hasta qué paso puede avanzar el usuario según lo que ya está guardado. */
function pasoMaximo(c: CampanaDetalle | undefined) {
  if (!c) return 1
  if (!c.archivoNombre) return 2
  if (c.registrosValidos === 0) return 3
  if (!c.plantilla) return 4
  if (!c.ejecucionInmediata && !c.fechaProgramada) return 5
  return 6
}

export default function CampanaWizardPage() {
  const { id } = useParams()
  const campanaId = id ? Number(id) : undefined
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: campana, isLoading, error } = useQuery({
    queryKey: ['campana', campanaId],
    queryFn: () => campanasApi.detalle(campanaId!),
    enabled: campanaId !== undefined,
  })

  const maximo = pasoMaximo(campana)
  const paso = Math.min(Number(params.get('paso') ?? 1), maximo)

  useEffect(() => { window.scrollTo({ top: 0 }) }, [paso])

  const ir = (p: number) => setParams({ paso: String(p) })

  /** Guarda la respuesta del backend en caché y avanza. */
  const alGuardar = (c: CampanaDetalle, siguiente: number) => {
    qc.setQueryData(['campana', c.id], c)
    qc.invalidateQueries({ queryKey: ['campanas'] })
    if (c.id !== campanaId) navigate(`/campanas/${c.id}/editar?paso=${siguiente}`, { replace: true })
    else ir(siguiente)
  }

  if (campanaId !== undefined && isLoading) return <p className="text-tenue">Cargando campaña…</p>
  if (error) return <Aviso tipo="error">{(error as Error).message}</Aviso>
  if (campana && !campana.acciones.editar) return <Navigate to={`/campanas/${campana.id}`} replace />

  const props = { campana: campana!, alGuardar, ir }

  return (
    <>
      <nav className="mb-2 text-sm text-tenue" aria-label="Ruta">
        <Link to="/campanas" className="hover:text-marca-600">Campañas</Link>
        <span className="mx-2">/</span>
        <span>{campana?.nombre ?? 'Nueva campaña'}</span>
      </nav>
      <Encabezado titulo={campana ? 'Editar campaña' : 'Nueva campaña'} />

      {campana?.motivoRechazo && (
        <div className="mb-6">
          <Aviso tipo="error"><b>Rechazada:</b> {campana.motivoRechazo}</Aviso>
        </div>
      )}

      <Pasos actual={paso} maximo={maximo} onIr={ir} />

      {paso === 1 && <PasoInfo campana={campana} alGuardar={alGuardar} />}
      {paso === 2 && <PasoCartera {...props} />}
      {paso === 3 && <PasoValidacion {...props} />}
      {paso === 4 && <PasoMensaje {...props} />}
      {paso === 5 && <PasoProgramacion {...props} />}
      {paso === 6 && <PasoConfirmacion {...props} />}
    </>
  )
}

export interface PasoProps {
  campana: CampanaDetalle
  alGuardar: (c: CampanaDetalle, siguiente: number) => void
  ir: (paso: number) => void
}
