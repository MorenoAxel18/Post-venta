import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, SESION_EXPIRADA, tokenStore } from '../api/client'
import type { LoginResponse, Permiso, Usuario } from '../api/tipos'

interface AuthState {
  usuario: Usuario | null
  cargando: boolean
  login: (correo: string, password: string) => Promise<Usuario>
  logout: () => void
  tiene: (p: Permiso) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(() => tokenStore.get() !== null)

  // Al recargar la página, recupera al usuario a partir del token guardado
  useEffect(() => {
    if (!tokenStore.get()) return
    api.get<Usuario>('/api/auth/me')
      .then(setUsuario)
      .catch(() => tokenStore.clear())
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    const alExpirar = () => setUsuario(null)
    window.addEventListener(SESION_EXPIRADA, alExpirar)
    return () => window.removeEventListener(SESION_EXPIRADA, alExpirar)
  }, [])

  const login = useCallback(async (correo: string, password: string) => {
    const r = await api.post<LoginResponse>('/api/auth/login', { correo, password })
    tokenStore.set(r.token)
    setUsuario(r.usuario)
    return r.usuario
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUsuario(null)
  }, [])

  const tiene = useCallback((p: Permiso) => usuario?.permisos.includes(p) ?? false, [usuario])

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, tiene }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
