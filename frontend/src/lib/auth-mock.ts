/* eslint-disable @typescript-eslint/no-unused-vars */
const AUTH_TOKEN_KEY = "hssabaty_token"
const REMEMBER_ME_KEY = "hssabaty_remember_me"
const USER_KEY = "hssabaty_user"
const REMEMBERED_EMAIL_KEY = "hssabaty_remembered_email"

export const USER_UPDATED_EVENT = "hssabaty:user-updated" as const

export type MockUser = {
  id: string
  name: string
  email: string
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(AUTH_TOKEN_KEY) ?? localStorage.getItem(AUTH_TOKEN_KEY)
}

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) || ""
}

export function getRememberMe(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(REMEMBER_ME_KEY) === "true"
}

export function setSession(token: string, user: MockUser, rememberMe: boolean) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(AUTH_TOKEN_KEY, token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  if (rememberMe) {
    localStorage.setItem(REMEMBER_ME_KEY, "true")
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem(REMEMBERED_EMAIL_KEY, user.email)
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

export function clearSession() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(AUTH_TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
  localStorage.removeItem(REMEMBER_ME_KEY)
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): MockUser | null {
  if (typeof window === "undefined") return null
  const fromSession = sessionStorage.getItem(USER_KEY)
  if (fromSession) return JSON.parse(fromSession) as MockUser
  const fromLocal = localStorage.getItem(USER_KEY)
  if (fromLocal) return JSON.parse(fromLocal) as MockUser
  return null
}

export function updateStoredUser(patch: Partial<MockUser>): void {
  if (typeof window === "undefined") return
  const current = getStoredUser()
  if (!current) return
  const updated: MockUser = { ...current, ...patch }
  sessionStorage.setItem(USER_KEY, JSON.stringify(updated))
  if (localStorage.getItem(USER_KEY)) {
    localStorage.setItem(USER_KEY, JSON.stringify(updated))
  }
  window.dispatchEvent(
    new CustomEvent<MockUser>(USER_UPDATED_EVENT, {
      detail: updated,
    })
  )
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false
  const token =
    sessionStorage.getItem(AUTH_TOKEN_KEY) ?? localStorage.getItem(AUTH_TOKEN_KEY)
  return !!token
}


export const DEMO_EMAIL = "demo@hssabty.com"
export const DEMO_PASSWORD = "demo123"


export function mockLogin(
  email: string,
  password: string,
  rememberMe: boolean
): { success: true; user: MockUser; token: string } | { success: false; error: string } {
  if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    return {
      success: false,
      error: "Identifiants incorrects. Utilisez le compte démo : demo@hssabty.com / demo123",
    }
  }
  const user: MockUser = {
    id: "1",
    name: "Démo",
    email: DEMO_EMAIL,
  }
  const token = "mock_jwt_" + Date.now()
  setSession(token, user, rememberMe)
  return { success: true, user, token }
}

/** Mock signup: always succeeds */
export function mockSignup(
  name: string,
  email: string,
  _password: string
): { success: true; user: MockUser } | { success: false; error: string } {
  const user: MockUser = { id: "1", name, email }
  return { success: true, user }
}

/** Mock forgot password: always succeeds */
export function mockForgotPassword(_email: string): { success: true } {
  return { success: true }
}

/** Mock reset password: always succeeds */
export function mockResetPassword(_token: string, _password: string): { success: true } {
  return { success: true }
}
