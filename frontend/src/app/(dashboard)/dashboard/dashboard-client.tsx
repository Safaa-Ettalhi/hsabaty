/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Label,
  LabelList,
  PolarGrid,
  PolarRadiusAxis,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
  Cell,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"

const soldeAreaChartConfig = {
  solde: {
    label: "Solde",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const soldeLineChartConfig = {
  solde: {
    label: "Solde",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const depensesPieConfig = {
  montant: {
    label: "Montant dépensé",
  },
} satisfies ChartConfig

const revenusDepensesBarConfig = {
  revenus: {
    label: "Revenus",
    color: "#533AFD",
  },
  depenses: {
    label: "Dépenses",
    color: "#E1DCFF",
  },
} satisfies ChartConfig

const revenusCanauxConfig = {
  montant: {
    label: "Montant",
  },
} satisfies ChartConfig

const chartCardClassName =
  "border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5"

const tauxEpargneRadialConfig = {
  realise: {
    label: "Épargne réalisée",
    color: "var(--chart-1)",
  },
  objectif: {
    label: "Objectif d'épargne",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function ChartAreaSolde({ evolutionData }: { evolutionData: any[] }) {
  const chartData = evolutionData.map((d) => ({
    month: new Date(d.date).toLocaleDateString("fr-FR", { month: "long" }),
    solde: d.solde,
  }))

  return (
    <Card className={chartCardClassName}>
      <CardHeader>
        <CardTitle>Évolution du solde</CardTitle>
        <CardDescription>
          Solde total sur la période
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {chartData.length > 0 ? (
          <ChartContainer
            config={soldeAreaChartConfig}
            className="h-55 w-full"
          >
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) =>
                  typeof value === "string" ? value.slice(0, 3) : value
                }
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                dataKey="solde"
                type="natural"
                fill="var(--color-solde)"
                fillOpacity={0.4}
                stroke="var(--color-solde)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Données insuffisantes
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChartSoldeLineLabel({ evolutionData }: { evolutionData: any[] }) {
  const chartData = evolutionData.map((d) => ({
    month: new Date(d.date).toLocaleDateString("fr-FR", { month: "short" }),
    solde: d.solde,
  }))

  return (
    <ChartContainer config={soldeLineChartConfig}>
      {chartData.length > 0 ? (
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 20, left: 12, right: 12 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value: string) => value?.slice(0, 3)}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          <Line
            dataKey="solde"
            type="natural"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ fill: "var(--chart-1)" }}
            activeDot={{ r: 6 }}
          >
            <LabelList
              position="top"
              offset={12}
              className="fill-foreground"
              fontSize={12}
              formatter={(value: number) =>
                value.toLocaleString("fr-MA", { maximumFractionDigits: 0 })
              }
            />
          </Line>
        </LineChart>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Données insuffisantes
        </div>
      )}
    </ChartContainer>
  )
}

function ChartRadialEpargne({ valeur }: { valeur: number }) {
  const clamped = Math.min(100, Math.max(0, valeur || 0))
  const chartData = [
    {
      name: "Épargne",
      pourcentage: clamped,
      fill: "#533AFD",
    },
  ]

  return (
    <Card className={`flex flex-col ${chartCardClassName}`}>
      <CardHeader className="items-center pb-0">
        <CardTitle>Taux d&apos;épargne</CardTitle>
        <CardDescription>Pourcentage de vos revenus économisé</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={tauxEpargneRadialConfig}
          className="mx-auto aspect-square max-h-64"
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-270}
            innerRadius={80}
            outerRadius={140}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="pourcentage" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {clamped.toFixed(1)}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          Épargne
                        </tspan>
                      </text>
                    )
                  }
                  return null
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm items-start text-left">
        <div className="leading-none text-muted-foreground text-center w-full pb-2">
          Le taux d&apos;épargne vous aide à mesurer l&apos;atteinte de vos objectifs.
        </div>
      </CardFooter>
    </Card>
  )
}

function ChartDepensesPieInteractive({ repartitionData }: { repartitionData: any[] }) {
  const top = (repartitionData || []).slice(0, 5)
  const opacities = [0.9, 0.7, 0.5, 0.35, 0.2]
  const pieData = top.map((item, index) => ({
    categorie: item.categorie,
    montant: item.montant,
    fill: `rgba(83, 58, 253, ${opacities[index] ?? 0.2})`,
  }))

  const total = pieData.reduce((sum, item) => sum + item.montant, 0)

  return (
    <Card className={`flex flex-col ${chartCardClassName}`}>
      <CardHeader className="items-center pb-0">
        <CardTitle>Répartition des dépenses</CardTitle>
        <CardDescription>
          Principales catégories
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {pieData.length > 0 ? (
          <>
            <ChartContainer
              config={depensesPieConfig}
              className="mx-auto aspect-square max-h-56 pb-0"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={pieData}
                  dataKey="montant"
                  nameKey="categorie"
                  label={false}
                />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 grid gap-1.5 text-xs">
              {pieData.map((item) => {
                const pct = total ? ((item.montant / total) * 100).toFixed(1) : "0.0"
                return (
                  <div
                    key={item.categorie}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="truncate">{item.categorie}</span>
                    </div>
                    <span className="tabular-nums text-muted-foreground">
                      {pct} %
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Aucune dépense sur la période
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm items-start text-left mt-2 pb-4">
        <div className="leading-none text-muted-foreground text-center w-full">
          Utile pour identifier les leviers d&apos;optimisation.
        </div>
      </CardFooter>
    </Card>
  )
}

function ChartRevenusDepensesStacked({ tendancesData }: { tendancesData: any[] }) {
  const chartData = moyennesTendances(tendancesData || [])

  return (
    <ChartContainer
      config={revenusDepensesBarConfig}
      className="mx-auto max-w-xl"
    >
      {chartData.length > 0 ? (
        <BarChart accessibilityLayer data={chartData}>
          <XAxis
            dataKey="label"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value: string) => value.slice(0, 3)}
          />
          <Bar
            dataKey="depenses"
            stackId="a"
            fill="#E1DCFF"
            radius={[0, 0, 4, 4]}
          />
          <Bar
            dataKey="revenus"
            stackId="a"
            fill="#533AFD"
            radius={[4, 4, 0, 0]}
          />
          <ChartTooltip
            content={<ChartTooltipContent indicator="line" />}
            cursor={false}
            defaultIndex={chartData.length - 1 > 0 ? chartData.length - 1 : 0}
          />
        </BarChart>
      ) : (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground w-full py-8">
          Données insuffisantes
        </div>
      )}
    </ChartContainer>
  )
}

function moyennesTendances(data: any[]) {
  return data.map(d => ({
    ...d,
    label: d.label || d.mois 
  }))
}

function ChartRevenusCanauxBar({ revenusData }: { revenusData: any[] }) {
  const opacities = [0.9, 0.7, 0.5, 0.35, 0.2]
  const chartData = (revenusData || []).slice(0, 6).map((r, i) => ({
    canal: r.categorie,
    montant: r.montant,
    fill: `rgba(83, 58, 253, ${opacities[i] ?? 0.2})`,
  }))

  return (
    <ChartContainer config={revenusCanauxConfig} className="min-h-62.5 w-full">
      {chartData.length > 0 ? (
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          margin={{ left: 0 }}
        >
          <YAxis
            dataKey="canal"
            type="category"
            width={140}
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <XAxis dataKey="montant" type="number" hide />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar dataKey="montant" layout="vertical" radius={5}>
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      ) : (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground w-full py-8">
          Aucun revenu sur la période
        </div>
      )}
    </ChartContainer>
  )
}

export function DashboardClient() {
  const [data, setData] = useState<any>(null)
  const [tendances, setTendances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const [resMetriques, resTendances] = await Promise.all([
        api.get<any>("/api/dashboard/metriques?periode=mois"),
        api.get<any>("/api/dashboard/tendances-mensuelles?nbMois=6")
      ])

      if (resMetriques.succes) {
        setData(resMetriques.donnees)
      } else {
        setErrorMsg("Erreur métriques: " + resMetriques.message)
      }

      if (resTendances.succes) {
        setTendances(resTendances.donnees.tendances)
      } else {
        setErrorMsg((prev) => (prev ? prev + " | " : "") + "Erreur tendances: " + resTendances.message)
      }
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e.message || "Erreur réseau inconnue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-8 pb-10 pt-4 px-4 md:px-6">
        {errorMsg && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {errorMsg}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
             <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-80 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-60 w-full rounded-xl" />
            <Skeleton className="h-60 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  const { metriques, repartitionDepenses, repartitionRevenus, evolutionSolde } = data

  const revenusFormatter = new Intl.NumberFormat("fr-MA", { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });

  return (
    <div className="space-y-8 pb-10 pt-4 px-4 md:px-6">
      {errorMsg && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md font-medium">
          Détail pour le développeur: {errorMsg}
        </div>
      )}
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card Revenus */}
        <Card className="border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Revenus de ce mois</CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl tabular-nums">{revenusFormatter.format(metriques?.revenus || 0)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="text-muted-foreground">Totalisé depuis le début du mois</p>
          </CardContent>
        </Card>

        {/* Card Dépenses */}
        <Card className="border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Dépenses de ce mois</CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl tabular-nums">{revenusFormatter.format(metriques?.depenses || 0)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="text-muted-foreground">Sorties d&apos;argent sur la période</p>
          </CardContent>
        </Card>

        {/* Card Solde */}
        <Card className="border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Solde actuel</CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl tabular-nums">{revenusFormatter.format(metriques?.solde || 0)}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="text-muted-foreground">La totalité de vos fonds disponibles</p>
          </CardContent>
        </Card>

        {/* Card Taux Epargne */}
        <Card className="border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Taux d&apos;épargne (Mois)</CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl tabular-nums">{(metriques?.tauxEpargne || 0).toFixed(1)}%</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="text-muted-foreground">Pourcentage de vos revenus conservés</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ChartAreaSolde evolutionData={evolutionSolde} />

          <Card className={chartCardClassName}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Solde global sur la période
              </CardTitle>
              <CardDescription>
                Vue détaillée de l&apos;évolution de votre solde.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartSoldeLineLabel evolutionData={evolutionSolde} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ChartRadialEpargne valeur={metriques?.tauxEpargne || 0} />
          <ChartDepensesPieInteractive repartitionData={repartitionDepenses} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={chartCardClassName}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Revenus vs dépenses par mois
            </CardTitle>
            <CardDescription>
              Comparaison de vos flux de trésorerie sur les derniers mois.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartRevenusDepensesStacked tendancesData={tendances} />
          </CardContent>
        </Card>

        <Card className={chartCardClassName}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Sources de revenus
            </CardTitle>
            <CardDescription>
              Répartition des revenus de ce mois.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartRevenusCanauxBar revenusData={repartitionRevenus} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}