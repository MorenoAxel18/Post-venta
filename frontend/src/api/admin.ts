import { api } from './client'
import type { Permiso, PermisoInfo, PlantillaAdmin, RegistroAuditoria, RolAdmin, UsuarioAdmin } from './tipos'

export interface DatosUsuario {
  nombre: string
  correo: string
  rolId: number
  activo: boolean
  password?: string
}

export interface DatosRol {
  codigo?: string
  nombre: string
  permisos: Permiso[]
}

export interface DatosPlantilla {
  nombre: string
  descripcion?: string | null
  cuerpo: string
  activa: boolean
}

const base = '/api/admin'

export const adminApi = {
  usuarios: (q?: string) => api.get<UsuarioAdmin[]>(`${base}/usuarios${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  crearUsuario: (d: DatosUsuario) => api.post<UsuarioAdmin>(`${base}/usuarios`, d),
  actualizarUsuario: (id: number, d: DatosUsuario) => api.put<UsuarioAdmin>(`${base}/usuarios/${id}`, d),
  cambiarPassword: (id: number, password: string) => api.put<void>(`${base}/usuarios/${id}/password`, { password }),

  permisos: () => api.get<PermisoInfo[]>(`${base}/permisos`),
  roles: () => api.get<RolAdmin[]>(`${base}/roles`),
  crearRol: (d: DatosRol) => api.post<RolAdmin>(`${base}/roles`, d),
  actualizarRol: (id: number, d: DatosRol) => api.put<RolAdmin>(`${base}/roles/${id}`, d),

  plantillas: () => api.get<PlantillaAdmin[]>(`${base}/plantillas`),
  crearPlantilla: (d: DatosPlantilla) => api.post<PlantillaAdmin>(`${base}/plantillas`, d),
  actualizarPlantilla: (id: number, d: DatosPlantilla) => api.put<PlantillaAdmin>(`${base}/plantillas/${id}`, d),

  auditoria: (entidad?: string) => api.get<RegistroAuditoria[]>(`${base}/auditoria${entidad ? `?entidad=${entidad}` : ''}`),
}
