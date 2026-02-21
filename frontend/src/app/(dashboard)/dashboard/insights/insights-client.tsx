"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type InsightsData = { insights: string }

export function InsightsClient() {
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<InsightsData>("/api/conseils/insights").then((res) => {
      if (res.succes && res.donnees) setInsights(res.donnees.insights)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Conseils & Insights</CardTitle>
          <CardDescription>Recommandations personnalisées par l’IA</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : insights ? (
            <div className="whitespace-pre-wrap text-sm">{insights}</div>
          ) : (
            <div className="bg-muted/50 flex h-[200px] items-center justify-center rounded-lg text-muted-foreground text-sm">Chargement des conseils...</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
