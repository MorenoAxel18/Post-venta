import { Check } from 'lucide-react'

export const PASOS = ['Información', 'Carga de archivo', 'Validación', 'Mensaje', 'Programación', 'Confirmación']

/** Barra de pasos. Solo se puede saltar a pasos ya alcanzados. */
export default function Pasos({ actual, maximo, onIr }: { actual: number; maximo: number; onIr: (p: number) => void }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-x-6 gap-y-3">
      {PASOS.map((nombre, i) => {
        const n = i + 1
        const hecho = n < actual
        const activo = n === actual
        const disponible = n <= maximo
        return (
          <li key={nombre}>
            <button
              type="button"
              disabled={!disponible}
              onClick={() => onIr(n)}
              aria-current={activo ? 'step' : undefined}
              className="flex items-center gap-2 text-sm disabled:cursor-not-allowed"
            >
              <span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                activo ? 'bg-marca-600 text-white'
                  : hecho ? 'bg-marca-100 text-marca-700'
                  : 'bg-white text-tenue ring-1 ring-linea'
              }`}>
                {hecho ? <Check className="size-3.5" aria-hidden /> : n}
              </span>
              <span className={activo ? 'font-semibold text-marca-700' : disponible ? 'text-tinta' : 'text-slate-400'}>
                {nombre}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
