import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Permiso } from '../api/tipos'
import { useAuth } from './AuthContext'
import { MODULOS } from './navegacion'
import SinPermisoPage from '../pages/SinPermisoPage'

export function RequireAuth() {
  const { usuario, cargando } = useAuth()
  const location = useLocation()
  if (cargando) return <div className="grid min-h-screen place-items-center text-tenue">Cargando…</div>
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  return <Outlet />
}

export function RequirePermiso({ permiso }: { permiso: Permiso }) {
  const { tiene } = useAuth()
  return tiene(permiso) ? <Outlet /> : <SinPermisoPage />
}

/** Manda a cada perfil al primer módulo al que tiene acceso. */
export function InicioRedirect() {
  const { tiene } = useAuth()
  const primero = MODULOS.find((m) => tiene(m.permiso))
  return primero ? <Navigate to={primero.ruta} replace /> : <SinPermisoPage />
}
