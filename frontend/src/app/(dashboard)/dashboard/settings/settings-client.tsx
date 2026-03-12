"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { logoutApi } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  IconUserCircle,
  IconChevronRight,
  IconLogout,
} from "@tabler/icons-react"
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"

const SECTIONS = [
  {
    href: "/dashboard/compte",
    icon: IconUserCircle,
    title: "Compte",
    description: "Prénom, email et mot de passe",
  },
] as const

export function SettingsClient() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logoutApi()
      router.replace("/login")
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

      <div className="grid gap-6 lg:grid-cols-[1fr,minmax(280px,360px)]">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sections du compte</CardTitle>
            <CardDescription>
              Accédez aux différentes parties de votre profil et de vos préférences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-3 transition-colors hover:bg-muted/50 hover:border-muted-foreground/20"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <section.icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{section.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{section.description}</p>
                </div>
                <IconChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-sm border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <IconLogout className="size-5 text-destructive" />
                Session
              </CardTitle>
              <CardDescription>
                Déconnectez-vous de ce compte sur cet appareil. Vous devrez vous reconnecter pour accéder à nouveau à Hssabaty.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full sm:w-auto"
              >
                {loggingOut ? "Déconnexion…" : "Se déconnecter"}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-4">
              <Link
                href="/dashboard/help"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>Centre d’aide et FAQ</span>
                <IconChevronRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardPageShell>
  )
}
