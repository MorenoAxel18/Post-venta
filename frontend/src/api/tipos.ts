export type Permiso =
  | 'CAMPANA_VER'
  | 'CAMPANA_CREAR'
  | 'CAMPANA_APROBAR'
  | 'CONVERSACION_VER_PROPIAS'
  | 'CONVERSACION_RESPONDER'
  | 'CONVERSACION_VER_TODAS'
  | 'CONVERSACION_REASIGNAR'
  | 'MONITOREO_VER'
  | 'ADMIN_USUARIOS'
  | 'ADMIN_REGLAS'

export interface Usuario {
  id: number
  nombre: string
  correo: string
  rol: string // código del perfil; ahora se pueden crear perfiles nuevos desde Configuración
  permisos: Permiso[]
}

export interface LoginResponse {
  token: string
  usuario: Usuario
}

export type EstadoCampana =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'PROGRAMADA'
  | 'EN_EJECUCION'
  | 'PAUSADA'
  | 'COMPLETADA'
  | 'CANCELADA'

export type EstadoEnvio = 'PENDIENTE' | 'ENVIADO' | 'ENTREGADO' | 'LEIDO' | 'FALLIDO' | 'CANCELADO'

export interface Plantilla {
  id: number
  nombre: string
  descripcion: string | null
  cuerpo: string
  variables: string[]
}

export interface CampanaResumen {
  id: number
  nombre: string
  objetivo: string
  estado: EstadoCampana
  creada: string
  fechaProgramada: string | null
  ejecucionInmediata: boolean
  destinatarios: number
}

export interface Acciones {
  editar: boolean
  enviarAprobacion: boolean
  aprobar: boolean
  rechazar: boolean
  pausar: boolean
  reanudar: boolean
  cancelar: boolean
  motivoNoAprobar: string | null
}

export interface CampanaDetalle {
  id: number
  nombre: string
  objetivo: string
  descripcion: string | null
  estado: EstadoCampana
  archivoNombre: string | null
  columnas: string[]
  totalRegistros: number
  registrosValidos: number
  registrosError: number
  plantilla: Plantilla | null
  mapeoVariables: Record<string, string>
  ejecucionInmediata: boolean
  fechaProgramada: string | null
  fechaInicioEnvio: string | null
  fechaFinEnvio: string | null
  creadaPor: string | null
  aprobadaPor: string | null
  fechaAprobacion: string | null
  motivoRechazo: string | null
  creada: string
  envios: Partial<Record<EstadoEnvio, number>>
  acciones: Acciones
}

export interface CargaResultado {
  archivo: string
  total: number
  validos: number
  errores: number
  columnas: string[]
}

export interface ErrorRegistro {
  fila: number
  idCliente: string | null
  telefono: string | null
  error: string
}

export interface Muestra {
  datos: Record<string, string>
  mensaje: string | null
}

// ---------- Administración ----------

export interface UsuarioAdmin {
  id: number
  nombre: string
  correo: string
  rolId: number
  rol: string
  activo: boolean
  ultimoAcceso: string | null
  creado: string
}

export interface PermisoInfo {
  codigo: Permiso
  descripcion: string
}

export interface RolAdmin {
  id: number
  codigo: string
  nombre: string
  permisos: Permiso[]
  usuarios: number
}

export interface PlantillaAdmin {
  id: number
  nombre: string
  descripcion: string | null
  cuerpo: string
  variables: string[]
  activa: boolean
  enUso: boolean
}

export interface RegistroAuditoria {
  id: number
  fecha: string
  usuario: string | null
  entidad: string
  entidadId: number | null
  accion: string
  detalle: string | null
}

// ---------- Monitoreo ----------

export interface ResumenMonitoreo {
  enviados: number
  fallidos: number
  tasaFallo: number
  entregados: number
  leidos: number
  pendientes: number
  campanasActivas: number
  campanasCompletadas: number
}

export interface PuntoDia {
  fecha: string // YYYY-MM-DD en hora del centro de México
  enviados: number
  fallidos: number
}

export interface FilaCampanaMonitoreo {
  id: number
  nombre: string
  objetivo: string
  estado: EstadoCampana
  fechaInicioEnvio: string | null
  fechaFinEnvio: string | null
  destinatarios: number
  enviados: number
  fallidos: number
  pendientes: number
  cancelados: number
}

export interface MotivoError {
  motivo: string
  total: number
}

export interface MonitoreoCampanas {
  desde: string
  hasta: string
  envioSimulado: boolean
  resumen: ResumenMonitoreo
  porDia: PuntoDia[]
  campanas: FilaCampanaMonitoreo[]
  erroresCartera: MotivoError[]
  erroresEnvio: MotivoError[]
}
