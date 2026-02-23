"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"

type FluxData = {
  sources: Array<{ nom: string; montant: number }>
  categories: Array<{ nom: string; montant: number }>
  epargne: number
}

export function CashflowClient() {
  const [data, setData] = useState<FluxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")

  useEffect(() => {
    const params = new URLSearchParams()
    if (dateDebut) params.set("dateDebut", dateDebut)
    if (dateFin) params.set("dateFin", dateFin)
    api
      .get<FluxData>(`/api/rapports/flux-tresorerie${params.toString() ? `?${params}` : ""}`)
      .then((res) => {
        if (res.succes && res.donnees) setData(res.donnees)
      })
      .finally(() => setLoading(false))
  }, [dateDebut, dateFin])

  const totalRevenus = data?.sources?.reduce((s, x) => s + x.montant, 0) ?? 0
  const totalDepenses = data?.categories?.reduce((s, x) => s + x.montant, 0) ?? 0
  const maxFlow = Math.max(totalRevenus, totalDepenses + (data?.epargne ?? 0), 1)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Flux de trésorerie</CardTitle>
            <CardDescription>Revenus → Dépenses → Épargne (épaisseur proportionnelle aux montants)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Input type="date" className="w-[140px]" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            <Input type="date" className="w-[140px]" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[280px] w-full rounded-lg" />
          ) : data ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">Sources de revenus</h4>
                  <div className="space-y-2">
                    {data.sources.map((s) => (
                      <div key={s.nom} className="flex items-center gap-2">
                        <div
                          className="h-6 min-w-[4px] rounded bg-green-500/80"
                          style={{ width: `${Math.max(4, (s.montant / maxFlow) * 120)}px` }}
                        />
                        <span className="text-sm">{s.nom}</span>
                        <span className="tabular-nums text-sm text-muted-foreground">{s.montant.toFixed(0)} MAD</span>
                      </div>
                    ))}
                    {!data.sources.length && <p className="text-muted-foreground text-sm">Aucune</p>}
                  </div>
                  <p className="mt-2 border-t pt-2 text-sm font-medium">Total entrées: {totalRevenus.toFixed(0)} MAD</p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">Catégories de dépenses</h4>
                  <div className="space-y-2">
                    {data.categories.map((c) => (
                      <div key={c.nom} className="flex items-center gap-2">
                        <div
                          className="h-6 min-w-[4px] rounded bg-rose-500/80"
                          style={{ width: `${Math.max(4, (c.montant / maxFlow) * 120)}px` }}
                        />
                        <span className="text-sm">{c.nom}</span>
                        <span className="tabular-nums text-sm text-muted-foreground">{c.montant.toFixed(0)} MAD</span>
                      </div>
                    ))}
                    {!data.categories.length && <p className="text-muted-foreground text-sm">Aucune</p>}
                  </div>
                  <p className="mt-2 border-t pt-2 text-sm font-medium">Total sorties: {totalDepenses.toFixed(0)} MAD</p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">Épargne nette</h4>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 min-w-[4px] rounded bg-primary/80"
                      style={{ width: `${Math.max(4, (Math.max(0, data.epargne) / maxFlow) * 120)}px` }}
                    />
                    <span className="tabular-nums font-medium">{data.epargne.toFixed(0)} MAD</span>
                  </div>
                </div>
              </div>
              <div className="border-t pt-4 text-sm text-muted-foreground">
                Entrées: {totalRevenus.toFixed(0)} MAD · Sorties: {totalDepenses.toFixed(0)} MAD · Net: {data.epargne.toFixed(0)} MAD
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 flex h-[200px] items-center justify-center rounded-lg text-muted-foreground text-sm">
              Aucune donnée
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
