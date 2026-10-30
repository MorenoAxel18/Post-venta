import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { MODULOS, NOMBRE_ROL } from '../auth/navegacion'

export default function AppLayout() {
  const { usuario, tiene, logout } = useAuth()
  if (!usuario) return null
  const iniciales = usuario.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-noche text-slate-200">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="grid size-9 place-items-center rounded-lg bg-marca-500 font-bold text-white">F</div>
          <div className="leading-tight">
            <p className="font-semibold text-white">Fincomún</p>
            <p className="text-sm text-slate-400">Postventa</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="Módulos">
          {MODULOS.filter((m) => tiene(m.permiso)).map((m) => (
            <NavLink
              key={m.ruta}
              to={m.ruta}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-marca-600 text-white' : 'text-slate-300 hover:bg-noche-2 hover:text-white'
                }`
              }
            >
              <m.icono className="size-[18px]" aria-hidden />
              {m.nombre}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-noche-2 text-sm font-semibold text-white">
              {iniciales}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-white">{usuario.nombre}</p>
              <p className="truncate text-xs text-slate-400">{NOMBRE_ROL[usuario.rol] ?? usuario.rol}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-2 text-slate-400 hover:bg-noche-2 hover:text-white"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-8 lg:px-12">
        <Outlet />
      </main>
    </div>
  )
}
