import { api } from "@/lib/api"
import {
  setSession,
  clearSession,
  type MockUser,
} from "@/lib/auth-mock"

type BackendUser = {
  id: string
  email: string
  nom: string
  prenom?: string
  devise?: string
}

function toFrontendUser(u: BackendUser): MockUser {
  const name = [u.nom, u.prenom].filter(Boolean).join(" ") || u.email
  return { id: String(u.id), name, email: u.email }
}

export async function loginApi(
  email: string,
  password: string,
  rememberMe: boolean
): Promise<
  | { success: true; user: MockUser; token: string }
  | { success: false; error: string }
> {
  const res = await api.post<{ utilisateur: BackendUser; token: string }>(
    "/api/auth/connecter",
    { email, motDePasse: password }
  )
  if (!res.succes || !res.donnees) {
    return {
      success: false,
      error: res.message || "Connexion échouée",
    }
  }
  const { utilisateur, token } = res.donnees
  setSession(token, toFrontendUser(utilisateur), rememberMe)
  return {
    success: true,
    user: toFrontendUser(utilisateur),
    token,
  }
}

export async function signupApi(
  name: string,
  email: string,
  password: string,
  devise = "MAD"
): Promise<
  | { success: true; user: MockUser; token: string }
  | { success: false; error: string }
> {
  const parts = name.trim().split(/\s+/)
  const nom = parts[0] ?? name
  const prenom = parts.slice(1).join(" ") || undefined
  const res = await api.post<{ utilisateur: BackendUser; token: string }>(
    "/api/auth/inscrire",
    {
      email,
      motDePasse: password,
      nom,
      prenom,
      devise,
    }
  )
  if (!res.succes || !res.donnees) {
    return {
      success: false,
      error: res.message || "Inscription échouée",
    }
  }
  const { utilisateur, token } = res.donnees
  setSession(token, toFrontendUser(utilisateur), false)
  return {
    success: true,
    user: toFrontendUser(utilisateur),
    token,
  }
}

export async function logoutApi(): Promise<void> {
  await api.post("/api/auth/deconnecter", {})
  clearSession()
}
