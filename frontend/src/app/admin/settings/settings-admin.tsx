"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { clearAdminSession } from "@/lib/admin-auth"
import { Button } from "@/components/ui/button"
import {
  IconUserCircle,
  IconChevronRight,
  IconLogout,
} from "@tabler/icons-react"
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"

const SECTIONS = [
  {
    href: "/admin/settings/compte",
    icon: IconUserCircle,
    title: "Compte",
    description: "Nom, email et mot de passe",
  },
] as const

export function SettingsAdmin() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      clearAdminSession()
      router.replace("/admin/login")
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <DashboardPageShell contentClassName="gap-6">
      <DashboardPageHeader
        title="Paramètres"
        description="Gérez votre compte, vos préférences et votre session en un seul endroit."
      />

      <div className="space-y-6">
        <div className="rounded-[24px] border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-950/50 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Sections du compte</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Accédez aux différentes parties de votre profil et de vos préférences.</p>
          </div>
          <div className="space-y-2">
            {SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="flex items-center gap-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-4 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:border-zinc-200 dark:hover:border-zinc-700 group ring-1 ring-transparent hover:ring-zinc-200/20"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <section.icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{section.title}</p>
                  <p className="truncate text-xs text-zinc-500">{section.description}</p>
                </div>
                <IconChevronRight className="size-5 shrink-0 text-zinc-300 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-rose-100/80 dark:border-rose-900/30 bg-white/50 dark:bg-zinc-950/50 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <IconLogout className="tabler-icon tabler-icon-logout size-5 text-destructive" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Session</h3>
          </div>
          <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
            Déconnectez-vous de ce compte sur cet appareil. Vous devrez vous reconnecter pour accéder à nouveau à Hssabaty.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full sm:w-auto"
          >
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </Button>
        </div>

        <div className="rounded-4xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-950/50 px-6 py-5 shadow-sm">
          <Link
            href="aide"
            className="flex items-center gap-2 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 group"
          >
            <span>Centre d’aide et FAQ</span>
            <IconChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </DashboardPageShell>
  )
}
