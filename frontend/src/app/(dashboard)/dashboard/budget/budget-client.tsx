"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

type Budget = {
  _id: string
  nom: string
  montant: number
  categorie?: string
  periode: string
  actif: boolean
  statistiques?: { montantUtilise: number; montantRestant: number; pourcentageUtilise: number; statut: string }
}

export function BudgetClient() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ budgets: Budget[] }>("/api/budgets")
      .then((res) => {
        if (res.succes && res.donnees?.budgets) setBudgets(res.donnees.budgets)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Budgets</CardTitle>
          <CardDescription>Suivi des budgets par catégorie</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : budgets.length ? (
            <ul className="space-y-4">
              {budgets.map((b) => (
                <li
                  key={b._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{b.nom}</p>
                    <p className="text-muted-foreground text-sm">
                      {b.categorie || "—"} · {b.periode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">
                      {b.statistiques?.montantUtilise?.toFixed(0) ?? 0} / {b.montant} MAD
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Reste: {b.statistiques?.montantRestant?.toFixed(0) ?? b.montant} MAD
                    </p>
                    <Badge variant={b.statistiques?.statut === "depasse" ? "destructive" : "outline"} className="mt-1">
                      {b.statistiques?.pourcentageUtilise?.toFixed(1) ?? 0} %
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-muted/50 flex h-[200px] items-center justify-center rounded-lg text-muted-foreground text-sm">
              Aucun budget. Créez-en un via le chat ou l’API.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
