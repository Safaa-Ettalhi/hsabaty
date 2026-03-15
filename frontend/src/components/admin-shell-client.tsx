"use client"

import { usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AdminSiteHeader } from "@/components/admin-site-header"

export function AdminShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/admin/login"

  if (isLogin) {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center p-6 bg-zinc-50/50 dark:bg-zinc-950/50">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        {children}
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <AdminSiteHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-zinc-50/80 dark:bg-zinc-950/50">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
