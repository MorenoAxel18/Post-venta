import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Plus, Search } from 'lucide-react'
import { adminApi } from '../../api/admin'
import type { RolAdmin, UsuarioAdmin } from '../../api/tipos'
import { fechaHora } from '../../api/formato'
import { useAuth } from '../../auth/AuthContext'
import { Aviso, Boton, Campo, Entrada, Selector, Tarjeta } from '../../components/ui'
import { Activo } from './comun'

const esquema = z.object({
  nombre: z.string().trim().min(3, 'Escribe el nombre completo').max(120),
  correo: z.string().trim().email('Correo no válido').max(160),
  rolId: z.coerce.number().min(1, 'Elige un perfil'),
  activo: z.boolean(),
  password: z.string().max(72).optional(),
})
type Datos = z.infer<typeof esquema>

const MIN_PASSWORD = 8

export default function UsuariosTab() {
  const [q, setQ] = useState('')
  const [editando, setEditando] = useState<UsuarioAdmin | 'nuevo' | null>(null)
  const [password, setPassword] = useState<UsuarioAdmin | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const usuarios = useQuery({ queryKey: ['admin', 'usuarios', q], queryFn: () => adminApi.usuarios(q.trim() || undefined) })
  const roles = useQuery({ queryKey: ['admin', 'roles'], queryFn: adminApi.roles })
  const nombreRol = (codigo: string) => roles.data?.find((r) => r.codigo === codigo)?.nombre ?? codigo

  const abrir = (u: UsuarioAdmin | 'nuevo') => {
    setPassword(null)
    setAviso(null)
    setEditando(u)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <Entrada className="pl-9" placeholder="Buscar por nombre o correo" value={q}
            onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuarios" />
        </div>
        <Boton onClick={() => abrir('nuevo')}><Plus className="size-4" aria-hidden />Nuevo usuario</Boton>
      </div>

      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      {usuarios.error && <Aviso tipo="error">{(usuarios.error as Error).message}</Aviso>}

      {editando && roles.data && (
        <FormularioUsuario
          key={editando === 'nuevo' ? 'nuevo' : editando.id}
          usuario={editando === 'nuevo' ? undefined : editando}
          roles={roles.data}
          alTerminar={(msg) => { setEditando(null); setAviso(msg) }}
        />
      )}
      {password && (
        <FormularioPassword key={password.id} usuario={password}
          alTerminar={(msg) => { setPassword(null); setAviso(msg) }} />
      )}

      <div className="overflow-x-auto rounded-xl border border-linea bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linea bg-slate-50 text-xs font-semibold text-tenue">
            <tr>
              <th className="px-5 py-3">Nombre</th>
              <th className="px-5 py-3">Perfil</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">Último acceso</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {usuarios.isLoading && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-tenue">Cargando usuarios…</td></tr>
            )}
            {usuarios.data?.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-tenue">No hay usuarios con esa búsqueda.</td></tr>
            )}
            {usuarios.data?.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <p className="font-medium">{u.nombre}</p>
                  <p className="text-xs text-tenue">{u.correo}</p>
                </td>
                <td className="px-5 py-3.5 text-tenue">{nombreRol(u.rol)}</td>
                <td className="px-5 py-3.5"><Activo activo={u.activo} /></td>
                <td className="px-5 py-3.5 text-tenue">{u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : 'Nunca'}</td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-1">
                    <Boton variante="fantasma" className="px-2.5" onClick={() => abrir(u)} aria-label={`Editar a ${u.nombre}`}>
                      <Pencil className="size-4" aria-hidden />Editar
                    </Boton>
                    <Boton variante="fantasma" className="px-2.5"
                      onClick={() => { setEditando(null); setAviso(null); setPassword(u) }}
                      aria-label={`Cambiar contraseña de ${u.nombre}`}>
                      <KeyRound className="size-4" aria-hidden />Contraseña
                    </Boton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FormularioUsuario({ usuario, roles, alTerminar }: {
  usuario?: UsuarioAdmin
  roles: RolAdmin[]
  alTerminar: (mensaje: string | null) => void
}) {
  const { usuario: yo } = useAuth()
  const qc = useQueryClient()
  const esYo = usuario?.id === yo?.id
  const { register, handleSubmit, formState, setError } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: usuario?.nombre ?? '',
      correo: usuario?.correo ?? '',
      rolId: usuario?.rolId ?? 0,
      activo: usuario?.activo ?? true,
      password: '',
    },
  })

  const guardar = useMutation({
    mutationFn: (d: Datos) => usuario ? adminApi.actualizarUsuario(usuario.id, d) : adminApi.crearUsuario(d),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      alTerminar(usuario ? `Se guardaron los cambios de ${u.nombre}.` : `Se creó el usuario ${u.correo}.`)
    },
  })

  const enviar = (d: Datos) => {
    if (!usuario && (d.password ?? '').length < MIN_PASSWORD) {
      setError('password', { message: `Mínimo ${MIN_PASSWORD} caracteres` })
      return
    }
    guardar.mutate(usuario ? { ...d, password: undefined } : d)
  }

  return (
    <form onSubmit={handleSubmit(enviar)} noValidate>
      <Tarjeta className="space-y-5">
        <h2 className="font-semibold">{usuario ? `Editar a ${usuario.nombre}` : 'Nuevo usuario'}</h2>
        {guardar.error && <Aviso tipo="error">{(guardar.error as Error).message}</Aviso>}
        <div className="grid gap-5 md:grid-cols-2">
          <Campo etiqueta="Nombre completo" htmlFor="nombre" error={formState.errors.nombre?.message}>
            <Entrada id="nombre" {...register('nombre')} />
          </Campo>
          <Campo etiqueta="Correo" htmlFor="correo" error={formState.errors.correo?.message}>
            <Entrada id="correo" type="email" autoComplete="off" {...register('correo')} />
          </Campo>
          <Campo etiqueta="Perfil" htmlFor="rolId" error={formState.errors.rolId?.message}
            ayuda={esYo ? 'No puedes cambiar tu propio perfil.' : undefined}>
            {/* Sin input registrado se envía el valor por defecto (un campo disabled llegaría vacío) */}
            {esYo ? (
              <Entrada id="rolId" readOnly value={roles.find((r) => r.id === usuario?.rolId)?.nombre ?? ''} />
            ) : (
              <Selector id="rolId" {...register('rolId')}>
                <option value={0}>Elige un perfil</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </Selector>
            )}
          </Campo>
          {!usuario && (
            <Campo etiqueta="Contraseña inicial" htmlFor="password" error={formState.errors.password?.message}
              ayuda={`Mínimo ${MIN_PASSWORD} caracteres. Compártela con el usuario por un canal seguro.`}>
              <Entrada id="password" type="password" autoComplete="new-password" {...register('password')} />
            </Campo>
          )}
        </div>
        {!esYo && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-marca-600" {...register('activo')} />
            Usuario activo (puede iniciar sesión)
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={() => alTerminar(null)}>Cancelar</Boton>
          <Boton type="submit" cargando={guardar.isPending}>{usuario ? 'Guardar cambios' : 'Crear usuario'}</Boton>
        </div>
      </Tarjeta>
    </form>
  )
}

function FormularioPassword({ usuario, alTerminar }: { usuario: UsuarioAdmin; alTerminar: (m: string | null) => void }) {
  const [valor, setValor] = useState('')
  const [invalido, setInvalido] = useState(false)
  const cambiar = useMutation({
    mutationFn: () => adminApi.cambiarPassword(usuario.id, valor),
    onSuccess: () => alTerminar(`Se cambió la contraseña de ${usuario.nombre}.`),
  })

  return (
    <form noValidate onSubmit={(e) => {
      e.preventDefault()
      if (valor.length < MIN_PASSWORD) return setInvalido(true)
      cambiar.mutate()
    }}>
      <Tarjeta className="space-y-4">
        <h2 className="font-semibold">Cambiar contraseña de {usuario.nombre}</h2>
        {cambiar.error && <Aviso tipo="error">{(cambiar.error as Error).message}</Aviso>}
        <div className="max-w-sm">
          <Campo etiqueta="Nueva contraseña" htmlFor="nueva" error={invalido ? `Mínimo ${MIN_PASSWORD} caracteres` : undefined}>
            <Entrada id="nueva" type="password" autoComplete="new-password" value={valor}
              onChange={(e) => { setValor(e.target.value); setInvalido(false) }} />
          </Campo>
        </div>
        <div className="flex justify-end gap-2">
          <Boton type="button" variante="secundario" onClick={() => alTerminar(null)}>Cancelar</Boton>
          <Boton type="submit" cargando={cambiar.isPending}>Cambiar contraseña</Boton>
        </div>
      </Tarjeta>
    </form>
  )
}
