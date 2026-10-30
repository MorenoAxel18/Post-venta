import { api, descargar } from './client'
import type {
  CampanaDetalle, CampanaResumen, CargaResultado, ErrorRegistro, EstadoCampana, Muestra, Plantilla,
} from './tipos'

export interface InfoCampana {
  nombre: string
  objetivo: string
  descripcion?: string
}

const base = '/api/campanas'

export const campanasApi = {
  listar: (estado?: EstadoCampana, q?: string) => {
    const p = new URLSearchParams()
    if (estado) p.set('estado', estado)
    if (q) p.set('q', q)
    return api.get<CampanaResumen[]>(`${base}?${p}`)
  },
  detalle: (id: number) => api.get<CampanaDetalle>(`${base}/${id}`),
  errores: (id: number) => api.get<ErrorRegistro[]>(`${base}/${id}/errores`),
  exportarErrores: (id: number) => descargar(`${base}/${id}/errores/export`, `errores_campana_${id}.csv`),
  muestra: (id: number) => api.get<Muestra>(`${base}/${id}/muestra`),
  plantillas: () => api.get<Plantilla[]>('/api/plantillas'),

  crear: (info: InfoCampana) => api.post<CampanaDetalle>(base, info),
  actualizarInfo: (id: number, info: InfoCampana) => api.put<CampanaDetalle>(`${base}/${id}/info`, info),
  cargarCartera: (id: number, archivo: File) => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    return api.post<CargaResultado>(`${base}/${id}/cartera`, fd)
  },
  actualizarMensaje: (id: number, plantillaId: number, mapeo: Record<string, string>) =>
    api.put<CampanaDetalle>(`${base}/${id}/mensaje`, { plantillaId, mapeo }),
  actualizarProgramacion: (id: number, inmediata: boolean, fechaProgramada: string | null) =>
    api.put<CampanaDetalle>(`${base}/${id}/programacion`, { inmediata, fechaProgramada }),

  enviarAprobacion: (id: number) => api.post<CampanaDetalle>(`${base}/${id}/enviar-aprobacion`),
  aprobar: (id: number) => api.post<CampanaDetalle>(`${base}/${id}/aprobar`),
  rechazar: (id: number, motivo: string) => api.post<CampanaDetalle>(`${base}/${id}/rechazar`, { motivo }),
  pausar: (id: number) => api.post<CampanaDetalle>(`${base}/${id}/pausar`),
  reanudar: (id: number) => api.post<CampanaDetalle>(`${base}/${id}/reanudar`),
  cancelar: (id: number) => api.post<CampanaDetalle>(`${base}/${id}/cancelar`),
}

export const OBJETIVOS = [
  'Recordatorio de pago',
  'Encuesta de satisfacción',
  'Seguimiento posdesembolso',
  'Informativa',
]
