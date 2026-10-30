import { BarChart3, Megaphone, MessagesSquare, Settings, type LucideIcon } from 'lucide-react'
import type { Permiso } from '../api/tipos'

export interface Modulo {
  ruta: string
  nombre: string
  icono: LucideIcon
  permiso: Permiso
}

/**
 * Única fuente de verdad del menú: el mismo permiso protege la ruta y decide
 * si la opción aparece. El backend vuelve a validarlo en cada endpoint.
 */
export const MODULOS: Modulo[] = [
  { ruta: '/campanas', nombre: 'Campañas', icono: Megaphone, permiso: 'CAMPANA_VER' },
  { ruta: '/atencion', nombre: 'Atención humana', icono: MessagesSquare, permiso: 'CONVERSACION_VER_PROPIAS' },
  { ruta: '/monitoreo', nombre: 'Monitoreo', icono: BarChart3, permiso: 'MONITOREO_VER' },
  { ruta: '/configuracion', nombre: 'Configuración', icono: Settings, permiso: 'ADMIN_USUARIOS' },
]

export const NOMBRE_ROL: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  AGENTE: 'Agente de Postventa',
}
