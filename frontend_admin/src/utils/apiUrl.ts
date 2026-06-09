const PRODUCTION_API_ORIGIN = 'https://datilio.com'

function isDatilioProductionHost(hostname: string): boolean {
  return hostname === 'datilio.com' || hostname.endsWith('.datilio.com')
}

/** Backend origin (no /api/v1 suffix). Set VITE_API_URL in .env or Docker build args. */
export function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location
    if (isDatilioProductionHost(hostname)) {
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
