"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type MensuelData = {
  resume: { revenus: number; depenses: number; epargne: number; tauxEpargne: number }
  repartitionDepenses?: Array<{ categorie: string; montant: number; pourcentage: number }>
  topDepenses?: Array<{ description: string; montant: number }>
}

export function ReportsClient() {
  const [data, setData] = useState<MensuelData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<MensuelData>("/api/rapports/mensuel").then((res) => {
      if (res.succes && res.donnees) setData(res.donnees)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Rapport mensuel</CardTitle>
          <CardDescription>Résumé du mois en cours</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : data?.resume ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="text-muted-foreground">Revenus</span> {data.resume.revenus.toFixed(0)} MAD</p>
              <p><span className="text-muted-foreground">Dépenses</span> {data.resume.depenses.toFixed(0)} MAD</p>
              <p><span className="text-muted-foreground">Épargne</span> {data.resume.epargne.toFixed(0)} MAD</p>
              <p><span className="text-muted-foreground">Taux d&apos;épargne</span> {data.resume.tauxEpargne.toFixed(1)} %</p>
            </div>
          ) : (
            <div className="bg-muted/50 flex h-[120px] items-center justify-center rounded-lg text-muted-foreground text-sm">Aucune donnée</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
