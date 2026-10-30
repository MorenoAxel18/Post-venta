import { useNavigate } from 'react-router-dom'
import { Boton } from '../../../components/ui'

export default function PiePaso({ onAnterior, textoSiguiente = 'Siguiente', onSiguiente, cargando, deshabilitado, tipoSiguiente = 'button' }: {
  onAnterior?: () => void
  textoSiguiente?: string
  onSiguiente?: () => void
  cargando?: boolean
  deshabilitado?: boolean
  tipoSiguiente?: 'button' | 'submit'
}) {
  const navigate = useNavigate()
  return (
    <div className="mt-6 flex justify-between border-t border-linea pt-5">
      {onAnterior
        ? <Boton variante="secundario" type="button" onClick={onAnterior}>Anterior</Boton>
        : <Boton variante="secundario" type="button" onClick={() => navigate('/campanas')}>Cancelar</Boton>}
      <Boton type={tipoSiguiente} onClick={onSiguiente} cargando={cargando} disabled={deshabilitado}>
        {textoSiguiente}
      </Boton>
    </div>
  )
}
