"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TABS = [
  { value: "insights", label: "Insights", path: "/api/conseils/insights", key: "insights" },
  { value: "reduction", label: "Réduction dépenses", path: "/api/conseils/recommandations/reduction-depenses", key: "recommandations" },
  { value: "optimisation", label: "Optimisation épargne", path: "/api/conseils/recommandations/optimisation-epargne", key: "recommandations" },
  { value: "inhabituelles", label: "Dépenses inhabituelles", path: "/api/conseils/depenses-inhabituelles", key: "depensesInhabituelles" },
  { value: "planification", label: "Planification", path: "/api/conseils/planification", key: "conseils" },
] as const

type InsightItem = { transaction?: { description: string; montant: number; categorie: string }; montant: number; moyenneMoisPrecedent: number; ecart: number }
type TabData = { text?: string; list?: InsightItem[] }

export function InsightsClient() {
  const [activeTab, setActiveTab] = useState("insights")
  const [data, setData] = useState<Record<string, TabData>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const tab = TABS.find((t) => t.value === activeTab)
    if (!tab) return
    setLoading((l) => ({ ...l, [activeTab]: true }))
    api.get(tab.path).then((res) => {
      if (res.succes && res.donnees) {
        const d = res.donnees as any
        if (tab.key === "depensesInhabituelles") {
          setData((prev) => ({
            ...prev,
            [activeTab]: { list: d.depensesInhabituelles ?? [] },
          }))
        } else {
          setData((prev) => ({
            ...prev,
            [activeTab]: { text: d[tab.key] ?? d.recommandations ?? d.conseils ?? "" },
          }))
        }
      }
    }).finally(() => setLoading((l) => ({ ...l, [activeTab]: false })))
  }, [activeTab])

  const current = data[activeTab]
  const isLoading = loading[activeTab]
  const tabConfig = TABS.find((t) => t.value === activeTab)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Conseils & Insights</CardTitle>
          <CardDescription>Recommandations personnalisées par l'IA</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap gap-1">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <Skeleton className="h-[200px] w-full rounded-lg" />
              ) : tabConfig?.key === "depensesInhabituelles" && current?.list ? (
                <div className="space-y-2">
                  {current.list.length ? (
                    <ul className="space-y-2 text-sm">
                      {current.list.map((item: any, i: number) => (
                        <li key={i} className="rounded border p-3">
                          <span className="font-medium">{item.transaction?.description ?? "Dépense"}</span>
                          <span className="text-muted-foreground"> · {item.montant?.toFixed(0)} MAD</span>
                          <span className="text-muted-foreground text-xs"> (moyenne: {item.moyenneMoisPrecedent?.toFixed(0)} MAD, +{item.ecart?.toFixed(0)} %)</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">Aucune dépense inhabituelle détectée.</p>
                  )}
                </div>
              ) : current?.text ? (
                <div className="whitespace-pre-wrap text-sm">{current.text}</div>
              ) : (
                <div className="bg-muted/50 flex h-[120px] items-center justify-center rounded-lg text-muted-foreground text-sm">
                  Aucun contenu
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
