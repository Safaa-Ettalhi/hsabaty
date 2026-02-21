"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type Recurrente = {
  _id: string
  description: string
  montant: number
  type: string
  categorie: string
  frequence: string
  prochaineDate: string
}

type Res = { transactionsRecurrentes: Recurrente[]; totalMensuel: number }

export function RecurringClient() {
  const [data, setData] = useState<Res | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Res>("/api/transactions-recurrentes").then((res) => {
      if (res.succes && res.donnees) setData(res.donnees)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Transactions récurrentes</CardTitle>
          <CardDescription>Abonnements et dépenses récurrentes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : data?.transactionsRecurrentes?.length ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">Total mensuel (équivalent): {data.totalMensuel?.toFixed(0) ?? 0} MAD</p>
              <ul className="space-y-2">
                {data.transactionsRecurrentes.map((t) => (
                  <li key={t._id} className="flex justify-between rounded border p-3 text-sm">
                    <span>{t.description}</span>
                    <span className="tabular-nums">{t.montant} MAD · {t.frequence} · prochaine: {new Date(t.prochaineDate).toLocaleDateString("fr-FR")}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="bg-muted/50 flex h-[200px] items-center justify-center rounded-lg text-muted-foreground text-sm">Aucune transaction récurrente</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
