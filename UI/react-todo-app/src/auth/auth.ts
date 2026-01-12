
export type AuthState = { token: string | null, roles: string[], userName?: string, userId?: string }
const KEY = 'todo_token'
function parseJwt(token: string) {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  }).join(''))
  return JSON.parse(jsonPayload)
}
export function setToken(token: string) { localStorage.setItem(KEY, token) }
export function logout() { localStorage.removeItem(KEY) }
export function getAuth(): AuthState | null {
  const token = localStorage.getItem(KEY)
  if (!token) return { token: null, roles: [] }
  try {
    const payload = parseJwt(token)
    const rolesKey = Object.keys(payload).find(k =>
      k.toLowerCase() === 'role' ||
      k.toLowerCase() === 'roles' ||
      k.toLowerCase().endsWith('/role') ||
      k.toLowerCase().endsWith('/roles')
    )
    const roles = rolesKey ? payload[rolesKey] : []
    const userName = payload['unique_name'] || payload['name']
    const userId = payload['sub']
    return { token, roles: Array.isArray(roles) ? roles : [roles], userName, userId }
  } catch { return { token: null, roles: [] } }
}
export function hasRole(role: string) { const auth = getAuth(); return auth?.roles?.includes(role) }
export function hasAnyRole(roles: string[]) { const auth = getAuth(); return roles.some(r => auth?.roles?.includes(r)) }
