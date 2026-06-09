/**
 * Resolve the API base URL (including /api/v1) for fetch clients.
 *
 * On production (*.datilio.com) always use HTTPS — ignores any http:// value
 * baked in at build time (fixes mixed-content when Docker layer cache is stale).
 */
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

export function getApiOrigin(): string {
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

export function getApiBaseUrl(): string {
  return `${getApiOrigin()}/api/v1`
}
