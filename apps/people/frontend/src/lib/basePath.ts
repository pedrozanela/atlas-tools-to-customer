export const PEOPLE_BASE_PATH = '/people'
export const PEOPLE_BASE_URL = `${PEOPLE_BASE_PATH}/`
export const PEOPLE_API_BASE = `${PEOPLE_BASE_PATH}/api`

export function peoplePath(path = ''): string {
  if (!path || path === '/') return PEOPLE_BASE_URL
  return `${PEOPLE_BASE_PATH}/${path.replace(/^\/+/, '')}`
}

export function isSameOriginUrl(url: string, origin: string): boolean {
  return new URL(url, origin).origin === origin
}
