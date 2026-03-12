"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { isAdminAuthenticated, getAdminToken } from "@/lib/admin-auth"

const getBase = () =>
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "")

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const isLogin = pathname === "/admin/login"

  useEffect(() => {
    if (isLogin) {
      if (isAdminAuthenticated()) {
        router.replace("/admin")
      }
      setReady(true)
      return
    }

    if (!isAdminAuthenticated()) {
      router.replace("/admin/login")
      return
    }

    // Optional: validate token still valid
    const token = getAdminToken()
    if (token) {
      fetch(`${getBase()}/api/admin/auth/moi`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => {
          if (r.status === 401 || r.status === 403) {
            import("@/lib/admin-auth").then(({ clearAdminSession }) => {
              clearAdminSession()
              router.replace("/admin/login")
            })
          } else {
            setReady(true)
          }
        })
        .catch(() => setReady(true))
    } else {
      router.replace("/admin/login")
    }
  }, [pathname, isLogin, router])

  if (isLogin) {
    return ready ? <>{children}</> : null
  }

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">Vérification…</p>
      </div>
    )
  }

  return <>{children}</>
}
