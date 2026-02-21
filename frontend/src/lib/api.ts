import { getStoredToken } from "@/lib/auth-mock"

const getBaseUrl = () =>
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "")
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

export type ApiResponse<T = unknown> =
  | { succes: true; donnees: T; message?: string }
  | { succes: false; message: string }

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const base = getBaseUrl()
  const token = typeof window !== "undefined" ? getStoredToken() : null
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
    credentials: "include",
  })

  const data = await res.json().catch(() => ({})) as ApiResponse<T>

  if (!res.ok) {
    return {
      succes: false,
      message: (data as { message?: string }).message || `Erreur ${res.status}`,
    }
  }

  return data as ApiResponse<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}

export function getApiUrl(): string {
  return getBaseUrl()
}
