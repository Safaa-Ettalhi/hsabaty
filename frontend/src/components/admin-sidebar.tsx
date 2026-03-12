"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, Shield, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { clearAdminSession, getAdminUser, adminHasPermission } from "@/lib/admin-auth"
import { Button } from "@/components/ui/button"

const nav = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, perm: null as string | null },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, perm: "gestion_utilisateurs" },
  { href: "/admin/admins", label: "Administrateurs", icon: Shield, perm: "gestion_admins" },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = getAdminUser()

  function logout() {
    clearAdminSession()
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-14 items-center border-b border-zinc-200/80 px-4 dark:border-zinc-800">
        <span className="bg-linear-to-r from-violet-600 to-indigo-600 bg-clip-text text-lg font-bold text-transparent dark:from-violet-400 dark:to-indigo-400">
          Hssabaty Admin
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map((item) => {
          if (item.perm && !adminHasPermission(item.perm)) return null
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-violet-500/10 text-violet-700 shadow-sm dark:bg-violet-500/15 dark:text-violet-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              )}
            >
              <Icon className={cn("size-4 shrink-0", active && "text-violet-600 dark:text-violet-400")} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-zinc-200/80 p-3 dark:border-zinc-800">
        {user && (
          <div className="mb-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {user.prenom ? `${user.prenom} ` : ""}
              {user.nom}
            </p>
            <p className="text-xs text-zinc-500">{user.role}</p>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 rounded-xl border-zinc-200 dark:border-zinc-700"
          onClick={logout}
        >
          <LogOut className="size-4" />
          Déconnexion
        </Button>
      </div>
    </aside>
  )
}
