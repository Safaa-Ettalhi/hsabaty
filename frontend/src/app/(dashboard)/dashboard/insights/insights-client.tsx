/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    if (data[activeTab]) return

     
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
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conseils &amp; Insights</CardTitle>
          <CardDescription>Recommandations personnalisées générées à partir de vos données</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
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
                <div className="flex h-45 flex-col items-center justify-center gap-3 rounded-lg border bg-muted/40 text-muted-foreground text-sm">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                  <div className="text-center">
                    <p className="font-medium text-foreground">Analyse de vos données…</p>
                    <p className="text-xs text-muted-foreground">
                      L&apos;assistant IA prépare des recommandations adaptées à votre situation.
                    </p>
                  </div>
                </div>
              ) : tabConfig?.key === "depensesInhabituelles" && current?.list ? (
                <div className="space-y-2">
                  {current.list.length ? (
                    <ul className="space-y-2 text-sm">
                      {current.list.map((item: any, i: number) => (
                        <li key={i} className="rounded-lg border bg-card/60 p-3 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium leading-snug">
                                {item.transaction?.description ?? "Dépense inhabituelle"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Catégorie&nbsp;: {item.transaction?.categorie ?? "–"}
                              </p>
                            </div>
                            <p className="tabular-nums text-sm font-semibold">
                              {item.montant?.toFixed(0)} MAD
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Moyenne mois précédent&nbsp;: {item.moyenneMoisPrecedent?.toFixed(0)} MAD ·
                            &nbsp;Écart&nbsp;: +{item.ecart?.toFixed(0)} %
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Aucune dépense inhabituelle détectée sur la période analysée.
                    </p>
                  )}
                </div>
              ) : current?.text ? (
                (() => {
                  const lines = current.text
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean)

                  if (!lines.length) {
                    return (
                      <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                        {current.text}
                      </div>
                    )
                  }

                  const [titleLine, ...rest] = lines
                  const rawRows = rest.length ? rest : lines

                  type Row = { main: string; details: string[] }
                  const rows: Row[] = []

                  rawRows.forEach((line) => {
                    const lower = line.toLowerCase()
                    const isDetail =
                      lower.startsWith("reste") ||
                      lower.startsWith("rest:") ||
                      lower.startsWith("⮕") ||
                      lower.startsWith("->")

                    if (isDetail && rows.length) {
                      rows[rows.length - 1].details.push(line)
                    } else {
                      rows.push({ main: line, details: [] })
                    }
                  })

                  return (
                    <div className="space-y-3">
                      {titleLine && rest.length > 0 && (
                        <p className="text-sm font-medium text-foreground">{titleLine}</p>
                      )}
                      <div className="overflow-hidden rounded-lg border bg-background">
                        <table className="w-full border-collapse text-sm">
                          <thead className="bg-muted/60">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-10">
                                #
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                                Recommandation
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((line, i) => (
                              <tr key={i} className="border-t border-border/70">
                                <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                                  {i + 1}
                                </td>
                                <td className="px-3 py-2 align-top whitespace-pre-wrap leading-relaxed">
                                  <p>{line.main}</p>
                                  {line.details.length > 0 && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {line.details.join(" ")}
                                    </p>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <div className="bg-muted/50 flex h-35 flex-col items-center justify-center gap-1 rounded-lg text-muted-foreground text-sm">
                  <p>Aucun conseil disponible pour le moment.</p>
                  <p className="text-xs">
                    Revenez après avoir enregistré quelques transactions pour obtenir des insights.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
