const ADMIN_TOKEN_KEY = "hssabaty_admin_token"
const ADMIN_USER_KEY = "hssabaty_admin_user"

export type AdminUser = {
  id: string
  email: string
  nom: string
  prenom?: string
  role: string
  permissions: string[]
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) ?? localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null
  const raw =
    sessionStorage.getItem(ADMIN_USER_KEY) ?? localStorage.getItem(ADMIN_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    return null
  }
}

export function setAdminSession(token: string, admin: AdminUser, rememberMe: boolean) {
  if (typeof window === "undefined") return
  const userJson = JSON.stringify(admin)
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
  sessionStorage.setItem(ADMIN_USER_KEY, userJson)
  if (rememberMe) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
    localStorage.setItem(ADMIN_USER_KEY, userJson)
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_USER_KEY)
  }
}

export function clearAdminSession() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_USER_KEY)
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_USER_KEY)
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken()
}

export function adminHasPermission(permission: string): boolean {
  const u = getAdminUser()
  if (!u) return false
  if (u.role === "super_admin") return true
  return u.permissions?.includes(permission) ?? false
}
