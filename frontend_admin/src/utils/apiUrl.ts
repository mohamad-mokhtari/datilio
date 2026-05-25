/** Backend origin (no /api/v1 suffix). Set VITE_API_URL in .env or Docker build args. */
export function getBackendBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  return baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
}

/** REST API base including /api/v1 — same convention as the main frontend. */
export function getApiV1BaseUrl(): string {
  return `${getBackendBaseUrl()}/api/v1`
}
