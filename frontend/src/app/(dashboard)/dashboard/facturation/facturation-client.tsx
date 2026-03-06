"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconCreditCard } from "@tabler/icons-react"

export function FacturationClient() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCreditCard className="size-5 text-primary" />
            Facturation
          </CardTitle>
          <CardDescription>
            Gestion des moyens de paiement et historique des factures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cette section sera disponible prochainement. Vous pourrez y gérer vos moyens de paiement
            et consulter l’historique de vos factures.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            En attendant, vous pouvez gérer votre <Link href="/dashboard/compte" className="font-medium text-primary underline underline-offset-4">compte</Link> et vos{" "}
            <Link href="/dashboard/notifications" className="font-medium text-primary underline underline-offset-4">notifications</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
