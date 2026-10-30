import { Encabezado, Tarjeta } from '../components/ui'

export default function ProximamentePage({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <>
      <Encabezado titulo={titulo} descripcion={descripcion} />
      <Tarjeta>
        <p className="text-sm text-tenue">Este módulo se construye en la siguiente fase del proyecto.</p>
      </Tarjeta>
    </>
  )
}
