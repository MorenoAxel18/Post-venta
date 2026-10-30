import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api/admin'
import { fechaHora } from '../../api/formato'
import { Aviso } from '../../components/ui'

const ENTIDADES: { valor?: string; nombre: string }[] = [
  { nombre: 'Todo' },
  { valor: 'CAMPANA', nombre: 'Campañas' },
  { valor: 'USUARIO', nombre: 'Usuarios' },
  { valor: 'ROL', nombre: 'Perfiles' },
  { valor: 'PLANTILLA', nombre: 'Plantillas' },
]

export default function BitacoraTab() {
  const [entidad, setEntidad] = useState<string | undefined>()
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'auditoria', entidad],
    queryFn: () => adminApi.auditoria(entidad),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo">
          {ENTIDADES.map((e) => (
            <button
              key={e.nombre}
              onClick={() => setEntidad(e.valor)}
              aria-pressed={entidad === e.valor}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                entidad === e.valor ? 'bg-marca-600 text-white' : 'bg-white text-tenue ring-1 ring-linea hover:text-tinta'
              }`}
            >
              {e.nombre}
            </button>
          ))}
        </div>
        <p className="text-xs text-tenue">Últimos 200 movimientos.</p>
      </div>

      {error && <Aviso tipo="error">{(error as Error).message}</Aviso>}

      <div className="overflow-x-auto rounded-xl border border-linea bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linea bg-slate-50 text-xs font-semibold text-tenue">
            <tr>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Usuario</th>
              <th className="px-5 py-3">Qué</th>
              <th className="px-5 py-3">Acción</th>
              <th className="px-5 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {isLoading && <tr><td colSpan={5} className="px-5 py-10 text-center text-tenue">Cargando…</td></tr>}
            {data?.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-tenue">Sin movimientos registrados.</td></tr>
            )}
            {data?.map((a) => (
              <tr key={a.id} className="align-top hover:bg-slate-50">
                <td className="whitespace-nowrap px-5 py-3 text-tenue">{fechaHora(a.fecha)}</td>
                <td className="px-5 py-3">{a.usuario ?? 'Sistema'}</td>
                <td className="whitespace-nowrap px-5 py-3 text-tenue">{a.entidad}{a.entidadId ? ` #${a.entidadId}` : ''}</td>
                <td className="whitespace-nowrap px-5 py-3 font-medium">{a.accion}</td>
                <td className="px-5 py-3 text-tenue">{a.detalle ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
