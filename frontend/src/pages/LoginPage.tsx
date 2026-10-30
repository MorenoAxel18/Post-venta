import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Aviso, Boton, Campo, Entrada } from '../components/ui'

const esquema = z.object({
  correo: z.string().email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
})
type Datos = z.infer<typeof esquema>

export default function LoginPage() {
  const { usuario, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<Datos>({ resolver: zodResolver(esquema) })

  if (usuario) return <Navigate to="/" replace />

  const enviar = async (d: Datos) => {
    setError(null)
    try {
      await login(d.correo, d.password)
      navigate((location.state as { desde?: string } | null)?.desde ?? '/', { replace: true })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
      <div className="hidden flex-col justify-between bg-noche p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-marca-500 text-lg font-bold">F</div>
          <span className="text-lg font-semibold">Fincomún Postventa</span>
        </div>
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-snug">
            Campañas, conversaciones y seguimiento de WhatsApp en un solo lugar.
          </p>
        </div>
        <p className="text-sm text-slate-400">Uso interno</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={handleSubmit(enviar)} className="w-full max-w-sm space-y-5" noValidate>
          <div>
            <h1 className="text-2xl font-bold">Inicia sesión</h1>
            <p className="mt-1 text-sm text-tenue">Usa tu correo de Fincomún.</p>
          </div>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Campo etiqueta="Correo" htmlFor="correo" error={formState.errors.correo?.message}>
            <Entrada id="correo" type="email" autoComplete="username" {...register('correo')} />
          </Campo>
          <Campo etiqueta="Contraseña" htmlFor="password" error={formState.errors.password?.message}>
            <Entrada id="password" type="password" autoComplete="current-password" {...register('password')} />
          </Campo>
          <Boton type="submit" className="w-full" cargando={formState.isSubmitting}>Iniciar sesión</Boton>
        </form>
      </div>
    </div>
  )
}
