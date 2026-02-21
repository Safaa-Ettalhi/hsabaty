"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { isAuthenticated } from "@/lib/auth-mock"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace(isAuthenticated() ? "/chat" : "/login")
  }, [router])

  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-muted-foreground">Redirection...</p>
    </div>
  )
}
