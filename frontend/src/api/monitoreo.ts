import { api } from './client'
import type { MonitoreoCampanas } from './tipos'

export interface FiltrosMonitoreo {
  desde?: string
  hasta?: string
  objetivo?: string
}

export const monitoreoApi = {
  campanas: (f: FiltrosMonitoreo) => {
    const p = new URLSearchParams()
    if (f.desde) p.set('desde', f.desde)
    if (f.hasta) p.set('hasta', f.hasta)
    if (f.objetivo) p.set('objetivo', f.objetivo)
    return api.get<MonitoreoCampanas>(`/api/monitoreo/campanas?${p}`)
  },
}
