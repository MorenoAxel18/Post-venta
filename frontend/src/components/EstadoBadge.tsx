import type { EstadoCampana } from '../api/tipos'

export const ETIQUETA_ESTADO: Record<EstadoCampana, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_APROBACION: 'Por aprobar',
  PROGRAMADA: 'Programada',
  EN_EJECUCION: 'En ejecución',
  PAUSADA: 'Pausada',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
}

const ESTILO: Record<EstadoCampana, string> = {
  BORRADOR: 'bg-slate-100 text-slate-700 ring-slate-200',
  PENDIENTE_APROBACION: 'bg-amber-50 text-amber-800 ring-amber-200',
  PROGRAMADA: 'bg-marca-50 text-marca-700 ring-marca-200',
  EN_EJECUCION: 'bg-sky-50 text-sky-800 ring-sky-200',
  PAUSADA: 'bg-orange-50 text-orange-800 ring-orange-200',
  COMPLETADA: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  CANCELADA: 'bg-red-50 text-red-700 ring-red-200',
}

export default function EstadoBadge({ estado }: { estado: EstadoCampana }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ESTILO[estado]}`}>
      {ETIQUETA_ESTADO[estado]}
    </span>
  )
}
