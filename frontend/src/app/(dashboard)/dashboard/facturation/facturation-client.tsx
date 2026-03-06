"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconCreditCard } from "@tabler/icons-react"

export function FacturationClient() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold md:text-2xl">Facturation</h1>
        <p className="text-sm text-muted-foreground">
          Centralisez la gestion de vos moyens de paiement et de vos futures factures Hssabaty.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconCreditCard className="size-5 text-primary" />
              Statut de la facturation
            </CardTitle>
            <CardDescription>Vue d’ensemble de votre abonnement et de la facturation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              La gestion détaillée de la facturation (offres, abonnements, factures PDF) sera
              disponible prochainement.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>• Suivi des abonnements et renouvellements.</li>
              <li>• Historique des factures téléchargeables.</li>
              <li>• Gestion des moyens de paiement sécurisés.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">En attendant…</CardTitle>
            <CardDescription>Paramétrez déjà votre compte et vos notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Vous pouvez dès maintenant garder vos informations à jour et recevoir les bonnes
              alertes :
            </p>
            <ul className="space-y-1 text-xs">
              <li>
                • Gérer vos informations personnelles dans{" "}
                <Link
                  href="/dashboard/compte"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Mon compte
                </Link>
                .
              </li>
              <li>
                • Choisir vos préférences d’alertes dans{" "}
                <Link
                  href="/dashboard/notifications"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Notifications & langue
                </Link>
                .
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
