import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Download, Users } from 'lucide-react'
import { campanasApi } from '../../../api/campanas'
import { numero } from '../../../api/formato'
import { Aviso, Boton, Tarjeta } from '../../../components/ui'
import type { PasoProps } from '../CampanaWizardPage'
import PiePaso from './PiePaso'

export default function PasoValidacion({ campana, ir }: PasoProps) {
  const { data: errores, isLoading } = useQuery({
    queryKey: ['errores', campana.id],
    queryFn: () => campanasApi.errores(campana.id),
    enabled: campana.registrosError > 0,
  })

  const cifras = [
    { etiqueta: 'Total de registros', valor: campana.totalRegistros, Icono: Users, color: 'text-marca-600' },
    { etiqueta: 'Válidos', valor: campana.registrosValidos, Icono: CheckCircle2, color: 'text-emerald-600' },
    { etiqueta: 'Con errores', valor: campana.registrosError, Icono: AlertTriangle, color: 'text-red-600' },
  ]

  return (
    <Tarjeta className="space-y-5">
      <h2 className="font-semibold">Resultado de la validación</h2>

      <div className="grid gap-3 sm:grid-cols-3">
        {cifras.map(({ etiqueta, valor, Icono, color }) => (
          <div key={etiqueta} className="flex items-center gap-3 rounded-lg border border-linea px-4 py-3">
            <Icono className={`size-6 ${color}`} aria-hidden />
            <div>
              <p className="text-xs text-tenue">{etiqueta}</p>
              <p className={`text-xl font-bold tabular-nums ${color}`}>{numero(valor)}</p>
            </div>
          </div>
        ))}
      </div>

      {campana.registrosValidos === 0 && (
        <Aviso tipo="error">Ningún registro es válido. Corrige el archivo y vuelve a cargarlo.</Aviso>
      )}

      {campana.registrosError > 0 && (
        <>
          <Aviso>
            Los {numero(campana.registrosError)} registros con error no recibirán el mensaje. Para incluirlos,
            corrígelos en tu archivo y vuelve a cargarlo.
          </Aviso>
          <div className="max-h-80 overflow-auto rounded-lg border border-linea">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs font-semibold text-tenue">
                <tr>
                  <th className="px-4 py-2.5">Fila</th>
                  <th className="px-4 py-2.5">ID cliente</th>
                  <th className="px-4 py-2.5">Teléfono</th>
                  <th className="px-4 py-2.5">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {isLoading && <tr><td colSpan={4} className="px-4 py-6 text-center text-tenue">Cargando…</td></tr>}
                {errores?.map((e) => (
                  <tr key={e.fila}>
                    <td className="px-4 py-2 tabular-nums">{e.fila}</td>
                    <td className="px-4 py-2">{e.idCliente || <span className="text-tenue">(vacío)</span>}</td>
                    <td className="px-4 py-2">{e.telefono || <span className="text-tenue">(vacío)</span>}</td>
                    <td className="px-4 py-2 font-medium text-red-700">{e.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Boton variante="secundario" onClick={() => campanasApi.exportarErrores(campana.id)}>
            <Download className="size-4" aria-hidden />Descargar reporte de errores
          </Boton>
        </>
      )}

      <PiePaso onAnterior={() => ir(2)} onSiguiente={() => ir(4)} deshabilitado={campana.registrosValidos === 0} />
    </Tarjeta>
  )
}
