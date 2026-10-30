const ZONA = 'America/Mexico_City'

export function fecha(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: ZONA }).format(new Date(iso))
}

export function fechaHora(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: ZONA })
    .format(new Date(iso))
}

export function numero(n: number) {
  return new Intl.NumberFormat('es-MX').format(n)
}
