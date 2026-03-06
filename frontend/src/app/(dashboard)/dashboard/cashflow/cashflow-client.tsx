"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type FluxData = {
  sources: Array<{ nom: string; montant: number }>
  categories: Array<{ nom: string; montant: number }>
  epargne: number
}

const revenusChartConfig = {
  revenus: {
    label: "Revenus",
    theme: {
      light: "hsl(142 76% 40%)",
      dark: "hsl(142 70% 55%)",
    },
  },
} satisfies ChartConfig

const depensesChartConfig = {
  depenses: {
    label: "Dépenses",
    theme: {
      light: "hsl(343 82% 50%)",
      dark: "hsl(343 90% 60%)",
    },
  },
} satisfies ChartConfig

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

  const revenusData =
    data?.sources?.map((s) => ({
      label: s.nom,
      montant: s.montant,
    })) ?? []

  const depensesData =
    data?.categories?.map((c) => ({
      label: c.nom,
      montant: c.montant,
    })) ?? []

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Flux de trésorerie</CardTitle>
            <CardDescription>Visualisation des entrées, sorties et de l&apos;épargne nette</CardDescription>
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              className="w-35"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
            />
            <Input
              type="date"
              className="w-35"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-80 w-full rounded-lg" />
          ) : data ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Total entrées</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {totalRevenus.toFixed(0)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">MAD</span>
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Total sorties</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {totalDepenses.toFixed(0)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">MAD</span>
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Épargne nette</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {data.epargne.toFixed(0)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">MAD</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Sources de revenus</p>
                  {revenusData.length ? (
                    <ChartContainer
                      config={revenusChartConfig}
                      className="aspect-auto h-65 w-full"
                    >
                      <BarChart
                        data={revenusData}
                        layout="vertical"
                        margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={120}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={4}
                        />
                        <ChartTooltip
                          cursor={{ fill: "hsl(var(--muted))" }}
                          content={
                            <ChartTooltipContent
                          formatter={(value) => [
                            `${Number(value).toFixed(0).toString()} MAD`,
                            "Revenus",
                          ]}
                            />
                          }
                        />
                        <Bar
                          dataKey="montant"
                      fill="var(--color-revenus)"
                      stroke="var(--color-revenus)"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="bg-muted/40 flex h-65 items-center justify-center rounded-lg text-xs text-muted-foreground">
                      Aucune source de revenus sur la période sélectionnée.
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Catégories de dépenses</p>
                  {depensesData.length ? (
                    <ChartContainer
                      config={depensesChartConfig}
                      className="aspect-auto h-65 w-full"
                    >
                      <BarChart
                        data={depensesData}
                        layout="vertical"
                        margin={{ left: 0, right: 16, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="label"
                          width={120}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={4}
                        />
                        <ChartTooltip
                          cursor={{ fill: "hsl(var(--muted))" }}
                          content={
                            <ChartTooltipContent
                          formatter={(value) => [
                            `${Number(value).toFixed(0).toString()} MAD`,
                            "Dépenses",
                          ]}
                            />
                          }
                        />
                        <Bar
                          dataKey="montant"
                      fill="var(--color-depenses)"
                      stroke="var(--color-depenses)"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="bg-muted/40 flex h-65 items-center justify-center rounded-lg text-xs text-muted-foreground">
                      Aucune dépense sur la période sélectionnée.
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 text-sm text-muted-foreground">
                Entrées: {totalRevenus.toFixed(0)} MAD · Sorties: {totalDepenses.toFixed(0)} MAD · Net:{" "}
                {data.epargne.toFixed(0)} MAD
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 flex h-50 items-center justify-center rounded-lg text-muted-foreground text-sm">
              Aucune donnée
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
