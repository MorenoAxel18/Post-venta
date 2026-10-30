import { useRef, useState, type DragEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { campanasApi } from '../../../api/campanas'
import { numero } from '../../../api/formato'
import { Aviso, Tarjeta } from '../../../components/ui'
import type { PasoProps } from '../CampanaWizardPage'
import PiePaso from './PiePaso'

const TAMANO_MAXIMO = 10 * 1024 * 1024
const EXTENSIONES = ['.xlsx', '.xls', '.csv']

function descargarEjemplo() {
  const csv = [
    'id_cliente,nombre,telefono,fecha_primer_pago,enlace',
    '10234,María López,5512345678,20/11/2026,https://fincomun.com.mx/pagos',
    '10567,Carlos Ramírez,+52 55 8765 4321,22/11/2026,https://fincomun.com.mx/pagos',
  ].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = 'plantilla_cartera.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function PasoCartera({ campana, ir }: PasoProps) {
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subir = async (archivo: File) => {
    setError(null)
    const nombre = archivo.name.toLowerCase()
    if (!EXTENSIONES.some((e) => nombre.endsWith(e))) {
      setError('Formato no soportado. Sube un archivo .xlsx, .xls o .csv.')
      return
    }
    if (archivo.size > TAMANO_MAXIMO) {
      setError('El archivo supera el tamaño máximo de 10 MB.')
      return
    }
    setSubiendo(true)
    try {
      await campanasApi.cargarCartera(campana.id, archivo)
      await qc.invalidateQueries({ queryKey: ['campana', campana.id] })
      qc.invalidateQueries({ queryKey: ['errores', campana.id] })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  const alSoltar = (e: DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    const f = e.dataTransfer.files[0]
    if (f) subir(f)
  }

  return (
    <Tarjeta className="space-y-5">
      <h2 className="font-semibold">Cargar cartera de clientes</h2>
      {error && <Aviso tipo="error">{error}</Aviso>}

      <div
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
        className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          arrastrando ? 'border-marca-500 bg-marca-50' : 'border-marca-200 bg-slate-50/50'
        }`}
      >
        <Upload className="mx-auto size-8 text-marca-500" aria-hidden />
        <p className="mt-3 text-sm">
          Arrastra tu archivo aquí o{' '}
          <button type="button" className="font-semibold text-marca-600 hover:underline" onClick={() => input.current?.click()}>
            selecciona uno
          </button>
        </p>
        <p className="mt-1 text-xs text-tenue">Excel (.xlsx, .xls) o CSV · Máximo 10 MB</p>
        <input
          ref={input}
          type="file"
          accept={EXTENSIONES.join(',')}
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = '' }}
        />
        {subiendo && <p className="mt-4 text-sm font-medium text-marca-700">Subiendo y validando…</p>}
      </div>

      {campana.archivoNombre && !subiendo && (
        <div className="flex items-center gap-3 rounded-lg border border-linea px-4 py-3">
          <FileSpreadsheet className="size-8 text-emerald-600" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-medium">{campana.archivoNombre}</p>
            <p className="text-xs text-tenue">
              {numero(campana.totalRegistros)} registros · {numero(campana.registrosValidos)} válidos ·{' '}
              {numero(campana.registrosError)} con error
            </p>
          </div>
          <p className="text-xs text-tenue">Sube otro archivo para reemplazarlo</p>
        </div>
      )}

      <button type="button" onClick={descargarEjemplo} className="inline-flex items-center gap-2 text-sm font-medium text-marca-600 hover:underline">
        <Download className="size-4" aria-hidden />Descargar plantilla de ejemplo
      </button>
      <p className="text-xs text-tenue">
        Columnas obligatorias: <b>id_cliente</b>, <b>nombre</b> y <b>telefono</b>. Las demás columnas se pueden usar
        como variables del mensaje.
      </p>

      <PiePaso onAnterior={() => ir(1)} onSiguiente={() => ir(3)} deshabilitado={!campana.archivoNombre || subiendo} />
    </Tarjeta>
  )
}
