import { ShieldOff } from 'lucide-react'

export default function SinPermisoPage() {
  return (
    <div className="mx-auto mt-24 max-w-md text-center">
      <ShieldOff className="mx-auto size-10 text-tenue" aria-hidden />
      <h1 className="mt-4 text-xl font-bold">No tienes acceso a esta sección</h1>
      <p className="mt-2 text-sm text-tenue">
        Tu perfil no incluye este módulo. Si lo necesitas, pide a un administrador que actualice tus permisos.
      </p>
    </div>
  )
}
