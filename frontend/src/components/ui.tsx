import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'

type Variante = 'primario' | 'secundario' | 'peligro' | 'exito' | 'fantasma'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-marca-600 text-white hover:bg-marca-700 disabled:bg-marca-200',
  secundario: 'border border-linea bg-white text-tinta hover:bg-slate-50 disabled:text-slate-400',
  peligro: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  exito: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-200',
  fantasma: 'text-marca-600 hover:bg-marca-50',
}

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  cargando?: boolean
}

export function Boton({ variante = 'primario', cargando, className = '', children, disabled, ...rest }: BotonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTES[variante]} ${className}`}
    >
      {cargando && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-linea bg-white p-6 ${className}`}>{children}</section>
}

export function Campo({ etiqueta, error, ayuda, children, htmlFor }: {
  etiqueta: string; error?: string; ayuda?: string; children: ReactNode; htmlFor?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-tinta">{etiqueta}</label>
      {children}
      {ayuda && !error && <p className="text-xs text-tenue">{ayuda}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

const claseControl =
  'w-full rounded-lg border border-linea bg-white px-3 py-2 text-sm text-tinta placeholder:text-slate-400 focus:border-marca-500 focus:outline-none focus:ring-2 focus:ring-marca-100'

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => <input ref={ref} {...rest} className={`${claseControl} ${className}`} />,
)

export const AreaTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...rest }, ref) => <textarea ref={ref} {...rest} className={`${claseControl} ${className}`} />,
)

export const Selector = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', ...rest }, ref) => <select ref={ref} {...rest} className={`${claseControl} ${className}`} />,
)

type TipoAviso = 'info' | 'error' | 'exito'

export function Aviso({ tipo = 'info', children }: { tipo?: TipoAviso; children: ReactNode }) {
  const estilos = {
    info: ['border-marca-100 bg-marca-50 text-marca-700', Info],
    error: ['border-red-200 bg-red-50 text-red-800', AlertCircle],
    exito: ['border-emerald-200 bg-emerald-50 text-emerald-800', CheckCircle2],
  } as const
  const [clase, Icono] = estilos[tipo]
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-lg border px-4 py-3 text-sm ${clase}`}>
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export function Encabezado({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-tenue">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  )
}
