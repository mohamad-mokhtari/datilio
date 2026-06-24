const PRODUCTION_API_ORIGIN = 'https://datilio.com'

function isDatilioProductionHost(hostname: string): boolean {
  return hostname === 'datilio.com' || hostname.endsWith('.datilio.com')
}

function resolveEnvApiOrigin(): string | null {
  const envUrl = import.meta.env.VITE_API_URL
  if (!envUrl || typeof envUrl !== 'string') return null
  const cleaned = envUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) return null
  return cleaned
}

/** Backend origin (no /api/v1 suffix). Set VITE_API_URL in .env or Docker build args. */
export function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location
    if (isDatilioProductionHost(hostname)) {
      const fromEnv = resolveEnvApiOrigin()
      if (fromEnv?.startsWith('https://')) {
        return fromEnv
      }
      return PRODUCTION_API_ORIGIN
    }
    let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    baseUrl = baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
    if (
      protocol === 'https:' &&
      baseUrl.startsWith('http://') &&
      !baseUrl.includes('localhost') &&
      !baseUrl.includes('127.0.0.1')
    ) {
      baseUrl = baseUrl.replace(/^http:\/\//, 'https://')
    }
    return baseUrl
  }
  let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  return baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
}

/** REST API base including /api/v1 — same convention as the main frontend. */
export function getApiV1BaseUrl(): string {
  return `${getBackendBaseUrl()}/api/v1`
}

/** Resolve feedback/static image paths to a browser-loadable URL. */
export function getStaticAssetUrl(pathOrUrl: string | undefined | null): string | undefined {
  if (!pathOrUrl) {
    return undefined
  }

  const backend = getBackendBaseUrl()

  if (
    pathOrUrl.startsWith('http://localhost:8000') ||
    pathOrUrl.startsWith('http://127.0.0.1:8000')
  ) {
    return pathOrUrl.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, backend)
  }

  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }

  const marker = 'user_images'
  const idx = pathOrUrl.indexOf(marker)
  if (idx !== -1) {
    const relative = pathOrUrl.slice(idx).replace(/\\/g, '/')
    return `${backend}/static/${relative}`
  }

  return pathOrUrl
}
