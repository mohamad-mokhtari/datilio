/**
 * Resolve the API base URL (including /api/v1) for fetch clients.
 * Upgrades http→https when the page is served over HTTPS to avoid mixed-content blocks.
 */
export function getApiOrigin(): string {
  let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  baseUrl = baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')

  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    baseUrl.startsWith('http://') &&
    !baseUrl.includes('localhost') &&
    !baseUrl.includes('127.0.0.1')
  ) {
    baseUrl = baseUrl.replace(/^http:\/\//, 'https://')
  }

  return baseUrl
}

export function getApiBaseUrl(): string {
  return `${getApiOrigin()}/api/v1`
}
