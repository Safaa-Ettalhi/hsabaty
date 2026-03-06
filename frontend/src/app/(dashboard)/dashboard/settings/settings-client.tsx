"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { logoutApi } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  IconUserCircle,
  IconNotification,
  IconCreditCard,
  IconSettings,
} from "@tabler/icons-react"

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
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconSettings className="size-5 text-primary" />
            Paramètres
          </CardTitle>
          <CardDescription>
            Accédez aux différentes sections de votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/dashboard/compte"
            className="flex items-center gap-3 rounded-lg border bg-card/40 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
          >
            <IconUserCircle className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Compte</p>
              <p className="text-xs text-muted-foreground">Nom, prénom, email et devise</p>
            </div>
          </Link>
          <Link
            href="/dashboard/notifications"
            className="flex items-center gap-3 rounded-lg border bg-card/40 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
          >
            <IconNotification className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Notifications</p>
              <p className="text-xs text-muted-foreground">Alertes email, navigateur et langue</p>
            </div>
          </Link>
          <Link
            href="/dashboard/facturation"
            className="flex items-center gap-3 rounded-lg border bg-card/40 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
          >
            <IconCreditCard className="size-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Facturation</p>
              <p className="text-xs text-muted-foreground">Moyens de paiement et factures</p>
            </div>
          </Link>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-destructive/30">
        <CardHeader>
          <CardTitle>Déconnexion</CardTitle>
          <CardDescription>Se déconnecter de ce compte sur cet appareil</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
