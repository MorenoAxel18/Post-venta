export function Activo({ activo, si = 'Activo', no = 'Inactivo' }: { activo: boolean; si?: string; no?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
      activo ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
    }`}>
      {activo ? si : no}
    </span>
  )
}
