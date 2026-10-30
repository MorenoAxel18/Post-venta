import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { Permiso, PermisoInfo, RolAdmin } from '../../api/tipos'
import { Aviso, Boton, Campo, Entrada, Tarjeta } from '../../components/ui'

export default function PerfilesTab() {
  const [editando, setEditando] = useState<RolAdmin | 'nuevo' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const roles = useQuery({ queryKey: ['admin', 'roles'], queryFn: adminApi.roles })
  const permisos = useQuery({ queryKey: ['admin', 'permisos'], queryFn: adminApi.permisos })
  const descripcion = (c: Permiso) => permisos.data?.find((p) => p.codigo === c)?.descripcion ?? c

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tenue">
          Los cambios de permisos se aplican cuando cada usuario vuelve a iniciar sesión.
        </p>
        <Boton onClick={() => { setAviso(null); setEditando('nuevo') }}>
          <Plus className="size-4" aria-hidden />Nuevo perfil
        </Boton>
      </div>

      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      {roles.error && <Aviso tipo="error">{(roles.error as Error).message}</Aviso>}

      {editando && permisos.data && (
        <FormularioRol
          key={editando === 'nuevo' ? 'nuevo' : editando.id}
          rol={editando === 'nuevo' ? undefined : editando}
          permisos={permisos.data}
          alTerminar={(m) => { setEditando(null); setAviso(m) }}
        />
      )}

      {roles.isLoading && <p className="text-tenue">Cargando perfiles…</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {roles.data?.map((r) => (
          <Tarjeta key={r.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{r.nombre}</h3>
                <p className="text-xs text-tenue">
                  {r.codigo} · {r.usuarios} {r.usuarios === 1 ? 'usuario' : 'usuarios'}
                </p>
              </div>
              <Boton variante="fantasma" className="px-2.5" onClick={() => { setAviso(null); setEditando(r) }}
                aria-label={`Editar perfil ${r.nombre}`}>
                <Pencil className="size-4" aria-hidden />Editar
              </Boton>
            </div>
            {r.permisos.length === 0 ? (
              <p className="text-sm text-tenue">Sin permisos.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {r.permisos.map((p) => (
                  <li key={p} className="rounded-full bg-marca-50 px-2.5 py-0.5 text-xs font-medium text-marca-700">
                    {descripcion(p)}
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        ))}
      </div>
    </div>
  )
}

function FormularioRol({ rol, permisos, alTerminar }: {
  rol?: RolAdmin
  permisos: PermisoInfo[]
  alTerminar: (mensaje: string | null) => void
}) {
  const qc = useQueryClient()
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState(rol?.nombre ?? '')
  const [elegidos, setElegidos] = useState<Set<Permiso>>(new Set(rol?.permisos ?? []))
  const [faltan, setFaltan] = useState(false)

  const guardar = useMutation({
    mutationFn: () => {
      const d = { nombre: nombre.trim(), permisos: [...elegidos] }
      return rol ? adminApi.actualizarRol(rol.id, d) : adminApi.crearRol({ ...d, codigo })
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      alTerminar(rol ? `Se guardó el perfil ${r.nombre}.` : `Se creó el perfil ${r.nombre}.`)
    },
  })

  const alternar = (p: Permiso) => setElegidos((s) => {
    const n = new Set(s)
    if (n.has(p)) n.delete(p)
    else n.add(p)
    return n
  })

  return (
    <form noValidate onSubmit={(e) => {
      e.preventDefault()
      if (!nombre.trim() || (!rol && codigo.length < 2)) return setFaltan(true)
      guardar.mutate()
    }}>
      <Tarjeta className="space-y-5">
        <h2 className="font-semibold">{rol ? `Editar perfil ${rol.nombre}` : 'Nuevo perfil'}</h2>
        {guardar.error && <Aviso tipo="error">{(guardar.error as Error).message}</Aviso>}
        <div className="grid gap-5 md:grid-cols-2">
          {!rol && (
            <Campo etiqueta="Código" htmlFor="codigo" ayuda="Mayúsculas, números y guion bajo. No se puede cambiar después."
              error={faltan && codigo.length < 2 ? 'Escribe un código' : undefined}>
              <Entrada id="codigo" placeholder="CONSULTA" value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))} maxLength={30} />
            </Campo>
          )}
          <Campo etiqueta="Nombre" htmlFor="nombre-rol" error={faltan && !nombre.trim() ? 'Escribe un nombre' : undefined}>
            <Entrada id="nombre-rol" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} />
          </Campo>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Permisos</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {permisos.map((p) => (
              <label key={p.codigo} className="flex items-start gap-2 rounded-lg border border-linea px-3 py-2 text-sm hover:bg-slate-50">
                <input type="checkbox" className="mt-0.5 size-4 accent-marca-600"
                  checked={elegidos.has(p.codigo)} onChange={() => alternar(p.codigo)} />
                <span>
                  {p.descripcion}
                  <span className="block text-xs text-tenue">{p.codigo}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={() => alTerminar(null)}>Cancelar</Boton>
          <Boton type="submit" cargando={guardar.isPending}>{rol ? 'Guardar cambios' : 'Crear perfil'}</Boton>
        </div>
      </Tarjeta>
    </form>
  )
}
