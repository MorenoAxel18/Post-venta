import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { campanasApi } from '../../api/campanas'
import type { EstadoCampana } from '../../api/tipos'
import { fecha, fechaHora, numero } from '../../api/formato'
import { useAuth } from '../../auth/AuthContext'
import { Aviso, Boton, Encabezado, Entrada } from '../../components/ui'
import EstadoBadge, { ETIQUETA_ESTADO } from '../../components/EstadoBadge'

const FILTROS: (EstadoCampana | undefined)[] = [
  undefined, 'BORRADOR', 'PENDIENTE_APROBACION', 'PROGRAMADA', 'EN_EJECUCION', 'COMPLETADA', 'CANCELADA',
]

export default function CampanasPage() {
  const { tiene } = useAuth()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<EstadoCampana | undefined>()
  const [q, setQ] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['campanas', estado, q],
    queryFn: () => campanasApi.listar(estado, q.trim() || undefined),
  })

  return (
    <>
      <Encabezado
        titulo="Campañas"
        descripcion="Envíos masivos de WhatsApp a la cartera de Postventa."
        acciones={tiene('CAMPANA_CREAR') && (
          <Boton onClick={() => navigate('/campanas/nueva')}><Plus className="size-4" aria-hidden />Nueva campaña</Boton>
        )}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Entrada
            className="pl-9"
            placeholder="Buscar por nombre"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar campañas por nombre"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f ?? 'todas'}
              onClick={() => setEstado(f)}
              aria-pressed={estado === f}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                estado === f ? 'bg-marca-600 text-white' : 'bg-white text-tenue ring-1 ring-linea hover:text-tinta'
              }`}
            >
              {f ? ETIQUETA_ESTADO[f] : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {error && <Aviso tipo="error">{(error as Error).message}</Aviso>}

      <div className="overflow-x-auto rounded-xl border border-linea bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linea bg-slate-50 text-xs font-semibold text-tenue">
            <tr>
              <th className="px-5 py-3">Nombre</th>
              <th className="px-5 py-3">Creación</th>
              <th className="px-5 py-3">Envío</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 text-right">Destinatarios</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {isLoading && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-tenue">Cargando campañas…</td></tr>
            )}
            {data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="font-medium">No hay campañas{estado || q ? ' con estos filtros' : ' todavía'}.</p>
                  {tiene('CAMPANA_CREAR') && !estado && !q && (
                    <p className="mt-1 text-tenue">Crea la primera con el botón “Nueva campaña”.</p>
                  )}
                </td>
              </tr>
            )}
            {data?.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <Link to={`/campanas/${c.id}`} className="font-medium text-tinta hover:text-marca-600">{c.nombre}</Link>
                  <p className="text-xs text-tenue">{c.objetivo}</p>
                </td>
                <td className="px-5 py-3.5 text-tenue">{fecha(c.creada)}</td>
                <td className="px-5 py-3.5 text-tenue">
                  {c.ejecucionInmediata && !c.fechaProgramada ? 'Al aprobarse' : fechaHora(c.fechaProgramada)}
                </td>
                <td className="px-5 py-3.5"><EstadoBadge estado={c.estado} /></td>
                <td className="px-5 py-3.5 text-right tabular-nums">{numero(c.destinatarios)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
