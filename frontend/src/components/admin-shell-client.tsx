"use client"

import { usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

export function AdminShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/admin/login"

  if (isLogin) {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="flex min-h-svh">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto bg-zinc-50/80 dark:bg-zinc-950/50">
          {children}
        </main>
      </div>
    </div>
  )
}
