/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList } from "recharts"
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react"

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
  montant: {
    label: "Revenus",
  },
} satisfies ChartConfig

const depensesChartConfig = {
  montant: {
    label: "Dépenses",
  },
} satisfies ChartConfig

const chartCardClassName =
  "border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5"

export function CashflowClient() {
  const [data, setData] = useState<FluxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setErrorMsg(null)
    const params = new URLSearchParams()
    if (dateDebut) params.set("dateDebut", dateDebut)
    if (dateFin) params.set("dateFin", dateFin)
    
    api
      .get<FluxData>(`/api/rapports/flux-tresorerie${params.toString() ? `?${params}` : ""}`)
      .then((res) => {
        if (res.succes && res.donnees) {
          setData(res.donnees)
        } else {
          setErrorMsg("Erreur de récupération: " + res.message)
        }
      })
      .catch((e: any) => {
        setErrorMsg(e.message || "Erreur réseau inconnue")
      })
      .finally(() => setLoading(false))
  }, [dateDebut, dateFin])

  const formatter = new Intl.NumberFormat("fr-MA", { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });

  const totalRevenus = data?.sources?.reduce((s, x) => s + x.montant, 0) ?? 0
  const totalDepenses = data?.categories?.reduce((s, x) => s + x.montant, 0) ?? 0

  const opacities = [0.9, 0.75, 0.6, 0.45, 0.3, 0.2]
  
  const revenusData = (data?.sources ?? [])
    .sort((a, b) => b.montant - a.montant)
    .map((s, idx) => ({
      label: s.nom,
      montant: s.montant,
      fill: `rgba(83, 58, 253, ${opacities[idx % opacities.length]})`,
    }))

  const depensesData = (data?.categories ?? [])
    .sort((a, b) => b.montant - a.montant)
    .map((c, idx) => ({
      label: c.nom,
      montant: c.montant,
      fill: `rgba(239, 68, 68, ${opacities[idx % opacities.length]})`,
    }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Flux de trésorerie</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Analyse détaillée de vos entrées et sorties pour la période.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-35 text-sm h-9"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            className="w-35 text-sm h-9"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md font-medium">
          Détail pour le développeur: {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      ) : !data ? (
        <div className="bg-muted/50 flex h-64 items-center justify-center rounded-lg text-muted-foreground text-sm">
          Auncune donnée disponible
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className={`${chartCardClassName} bg-linear-to-br from-green-50/50 to-green-100/20 dark:from-green-950/20 dark:to-transparent border-green-200/50 dark:border-green-900/50`}>
              <CardHeader className="pb-2">
                <CardDescription className="text-green-700/80 dark:text-green-400/80 font-medium">Total entrées</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className="text-3xl font-bold tabular-nums text-green-700 dark:text-green-400">
                    +{formatter.format(totalRevenus)}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <p className="text-muted-foreground">Somme de toutes vos sources de revenus</p>
              </CardContent>
            </Card>

            <Card className={`${chartCardClassName} bg-linear-to-br from-red-50/50 to-red-100/20 dark:from-red-950/20 dark:to-transparent border-red-200/50 dark:border-red-900/50`}>
              <CardHeader className="pb-2">
                <CardDescription className="text-red-700/80 dark:text-red-400/80 font-medium">Total sorties</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className="text-3xl font-bold tabular-nums text-red-700 dark:text-red-400">
                    -{formatter.format(totalDepenses)}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                    <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <p className="text-muted-foreground">Somme de toutes vos dépenses</p>
              </CardContent>
            </Card>

            <Card className={`${chartCardClassName} bg-linear-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-transparent border-primary/20`}>
              <CardHeader className="pb-2">
                <CardDescription className="text-primary/80 font-medium">Épargne nette</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className="text-3xl font-bold tabular-nums text-primary">
                    {formatter.format(data.epargne)}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                <p className="text-muted-foreground">Votre capacité de financement sur la période</p>
              </CardContent>
            </Card>
          </div>

          {/* Graphiques détaillés */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Graphique Revenus */}
            <Card className={chartCardClassName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-600 dark:text-green-400">Détail des entrées</CardTitle>
                <CardDescription>
                  Vos sources de revenus par ordre d&apos;importance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {revenusData.length > 0 ? (
                  <ChartContainer
                    config={revenusChartConfig}
                    className="min-h-75 w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={revenusData}
                      layout="vertical"
                      margin={{ left: 0, right: 16 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        type="number" 
                        hide 
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={130}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        className="text-sm font-medium fill-foreground"
                      />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        content={<ChartTooltipContent 
                          indicator="dot"
                          formatter={(value) => [formatter.format(Number(value)), "Montant"]}
                        />}
                      />
                      <Bar
                        dataKey="montant"
                        layout="vertical"
                        radius={[0, 6, 6, 0]}
                        barSize={32}
                      >
                        {revenusData.map((entry, index) => (
                          <Cell key={`cell-rev-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList 
                          dataKey="montant" 
                          position="right" 
                          formatter={(val: number) => formatter.format(val)}
                          className="fill-muted-foreground text-xs font-medium"
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="bg-muted/40 flex h-75 items-center justify-center rounded-lg text-sm text-muted-foreground">
                    Aucune source de revenus
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Graphique Dépenses */}
            <Card className={chartCardClassName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive">Détail des sorties</CardTitle>
                <CardDescription>
                  Vos catégories de dépenses par ordre d&apos;importance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {depensesData.length > 0 ? (
                  <ChartContainer
                    config={depensesChartConfig}
                    className="min-h-75 w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={depensesData}
                      layout="vertical"
                      margin={{ left: 0, right: 16 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        type="number" 
                        hide 
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={130}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        className="text-sm font-medium fill-foreground"
                      />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        content={<ChartTooltipContent 
                          indicator="dot"
                          formatter={(value) => [formatter.format(Number(value)), "Montant"]}
                        />}
                      />
                      <Bar
                        dataKey="montant"
                        layout="vertical"
                        radius={[0, 6, 6, 0]}
                        barSize={32}
                      >
                        {depensesData.map((entry, index) => (
                          <Cell key={`cell-dep-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList 
                          dataKey="montant" 
                          position="right" 
                          formatter={(val: number) => formatter.format(val)}
                          className="fill-muted-foreground text-xs font-medium"
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="bg-muted/40 flex h-75 items-center justify-center rounded-lg text-sm text-muted-foreground">
                    Aucune dépense
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
