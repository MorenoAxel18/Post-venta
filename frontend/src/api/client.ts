const TOKEN_KEY = 'postventa.token'

export class ApiError extends Error {
  status: number
  campos?: Record<string, string>

  constructor(status: number, mensaje: string, campos?: Record<string, string>) {
    super(mensaje)
    this.status = status
    this.campos = campos
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

/** Se dispara cuando el backend responde 401, para regresar al login. */
export const SESION_EXPIRADA = 'postventa:sesion-expirada'

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(url, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Verifica que el backend esté encendido.')
  }

  if (res.status === 401 && token) {
    tokenStore.clear()
    window.dispatchEvent(new Event(SESION_EXPIRADA))
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(res.status, data?.mensaje ?? `Error ${res.status}`, data?.campos)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body),
}

/** Descarga un archivo protegido (no se puede con un <a href> porque requiere el token). */
export async function descargar(url: string, nombreArchivo: string) {
  const token = tokenStore.get()
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new ApiError(res.status, 'No se pudo descargar el archivo.')
  const blob = await res.blob()
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(blob)
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}
