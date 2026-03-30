const BASE_URL = 'https://api.dyspatch.io'

export class DyspatchError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly parameter?: string,
    public readonly statusCode?: number,
  ) {
    super(`${code}: ${message}`)
    this.name = 'DyspatchError'
  }
}

export class DyspatchClient {
  private readonly apiKey: string
  private readonly version: string

  constructor(apiKey: string, version = '2026.01') {
    this.apiKey = apiKey
    this.version = version
  }

  private async request<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${path}`
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: `application/vnd.dyspatch.${this.version}+json`,
        'Content-Type': 'application/json',
        ...opts.headers,
      },
    })

    if (!res.ok) {
      let code = 'server_error'
      let message = `HTTP ${res.status}`
      let parameter: string | undefined
      try {
        const body = (await res.json()) as { code?: string; message?: string; parameter?: string }
        if (body.code) code = body.code
        if (body.message) message = body.message
        parameter = body.parameter
      } catch {
        // ignore parse error, use defaults
      }
      throw new DyspatchError(code, message, parameter, res.status)
    }

    if (res.status === 204) return undefined as T
    const text = await res.text()
    if (!text) return undefined as T
    return JSON.parse(text) as T
  }

  get<T>(path: string, query?: Record<string, string | undefined>): Promise<T> {
    const qs = query ? buildQuery(query) : ''
    return this.request<T>(`${path}${qs}`)
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  postText<T>(path: string, body?: string): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  delete<T = void>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' })
  }
}

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries).toString()
}

/** Returns the URL prefix for a given template type. Email has no prefix. */
export function typePath(type: string): string {
  return type === 'email' ? '' : `/${type}`
}

export function createClient(): DyspatchClient {
  const apiKey = process.env.DYSPATCH_API_KEY
  if (!apiKey) throw new Error('DYSPATCH_API_KEY environment variable is required')
  const version = process.env.DYSPATCH_API_VERSION ?? '2026.01'
  return new DyspatchClient(apiKey, version)
}
