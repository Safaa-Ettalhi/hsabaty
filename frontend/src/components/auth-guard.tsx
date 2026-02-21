"use client"

import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { isAuthenticated } from "@/lib/auth-mock"

const AUTH_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const auth = isAuthenticated()
    const isAuthPath = AUTH_PATHS.some((p) => pathname === p || pathname?.startsWith(p + "?"))
    const isAppPath = pathname === "/" || pathname?.startsWith("/chat") || pathname?.startsWith("/dashboard")

    if (pathname === "/") {
      router.replace(auth ? "/chat" : "/login")
      return
    }
    if (!auth && isAppPath) {
      router.replace("/login")
      return
    }
    if (auth && isAuthPath) {
      router.replace("/chat")
    }
  }, [pathname, router])

  return <>{children}</>
}
