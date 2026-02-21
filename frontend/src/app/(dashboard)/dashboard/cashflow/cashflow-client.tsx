"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type FluxData = {
  sources: Array<{ nom: string; montant: number }>
  categories: Array<{ nom: string; montant: number }>
  epargne: number
}

export function CashflowClient() {
  const [data, setData] = useState<FluxData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<FluxData>("/api/rapports/flux-tresorerie").then((res) => {
      if (res.succes && res.donnees) setData(res.donnees)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Flux de trésorerie</CardTitle>
          <CardDescription>Revenus, dépenses et épargne sur la période</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : data ? (
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 font-medium">Sources de revenus</h4>
                <ul className="space-y-1 text-sm">
                  {data.sources.map((s) => (
                    <li key={s.nom} className="flex justify-between"><span>{s.nom}</span><span className="tabular-nums">{s.montant.toFixed(0)} MAD</span></li>
                  ))}
                  {!data.sources.length && <li className="text-muted-foreground">Aucune</li>}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-medium">Catégories de dépenses</h4>
                <ul className="space-y-1 text-sm">
                  {data.categories.map((c) => (
                    <li key={c.nom} className="flex justify-between"><span>{c.nom}</span><span className="tabular-nums">{c.montant.toFixed(0)} MAD</span></li>
                  ))}
                  {!data.categories.length && <li className="text-muted-foreground">Aucune</li>}
                </ul>
              </div>
              <p className="border-t pt-4 font-medium">Épargne nette: {data.epargne.toFixed(0)} MAD</p>
            </div>
          ) : (
            <div className="bg-muted/50 flex h-[200px] items-center justify-center rounded-lg text-muted-foreground text-sm">Aucune donnée</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
