import { useSearchParams } from 'react-router-dom'
import type { Permiso } from '../../api/tipos'
import { useAuth } from '../../auth/AuthContext'
import { Encabezado } from '../../components/ui'
import UsuariosTab from './UsuariosTab'
import PerfilesTab from './PerfilesTab'
import PlantillasTab from './PlantillasTab'
import BitacoraTab from './BitacoraTab'

const PESTANAS: { id: string; nombre: string; permiso: Permiso; componente: () => JSX.Element }[] = [
  { id: 'usuarios', nombre: 'Usuarios', permiso: 'ADMIN_USUARIOS', componente: UsuariosTab },
  { id: 'perfiles', nombre: 'Perfiles y permisos', permiso: 'ADMIN_USUARIOS', componente: PerfilesTab },
  { id: 'plantillas', nombre: 'Plantillas', permiso: 'ADMIN_REGLAS', componente: PlantillasTab },
  { id: 'bitacora', nombre: 'Bitácora', permiso: 'ADMIN_USUARIOS', componente: BitacoraTab },
]

export default function ConfiguracionPage() {
  const { tiene } = useAuth()
  const [params, setParams] = useSearchParams()
  const visibles = PESTANAS.filter((p) => tiene(p.permiso))
  const actual = visibles.find((p) => p.id === params.get('tab')) ?? visibles[0]
  const Contenido = actual?.componente

  return (
    <>
      <Encabezado titulo="Configuración" descripcion="Usuarios, perfiles, plantillas de WhatsApp y bitácora de cambios." />

      <div className="mb-6 flex gap-1 border-b border-linea" role="tablist">
        {visibles.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={p === actual}
            onClick={() => setParams({ tab: p.id }, { replace: true })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              p === actual ? 'border-marca-600 text-marca-600' : 'border-transparent text-tenue hover:text-tinta'
            }`}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {Contenido && <Contenido />}
    </>
  )
}
