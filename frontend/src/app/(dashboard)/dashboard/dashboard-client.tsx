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
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"
import { FluxCardEntrees, FluxCardSorties, FluxCardSolde } from "@/components/flux-kpi-cards"
import { ArrowUpCircle, ArrowDownCircle, Wallet, PiggyBank, CalendarRange } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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

type PeriodePreset = "mois" | "mois_precedent" | "trimestre" | "semestre" | "annee" | "personnalise"

function formatPeriodeLabel(dateDebut: string | Date, dateFin: string | Date) {
  const a = typeof dateDebut === "string" ? new Date(dateDebut) : dateDebut
  const b = typeof dateFin === "string" ? new Date(dateFin) : dateFin
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
  return `${a.toLocaleDateString("fr-FR", opts)} – ${b.toLocaleDateString("fr-FR", opts)}`
}

export function DashboardClient() {
  const [data, setData] = useState<any>(null)
  const [tendances, setTendances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [periodePreset, setPeriodePreset] = useState<PeriodePreset>("mois")
  const [dateDebutCustom, setDateDebutCustom] = useState("")
  const [dateFinCustom, setDateFinCustom] = useState("")

  const buildMetriquesUrl = (): string | null => {
    if (periodePreset === "personnalise") {
      if (!dateDebutCustom || !dateFinCustom) return null
      const params = new URLSearchParams()
      params.set("dateDebut", dateDebutCustom)
      params.set("dateFin", dateFinCustom)
      return `/api/dashboard/metriques?${params.toString()}`
    }
    return `/api/dashboard/metriques?periode=${periodePreset}`
  }

  const loadData = async () => {
    const metriquesUrl = buildMetriquesUrl()
    if (!metriquesUrl) {
      setErrorMsg("Choisissez une date de début et de fin, puis cliquez sur Appliquer.")
      setLoading(false)
      return
    }
    setLoading(true)
    setErrorMsg(null)
    try {
      const nbMois = periodePreset === "annee" ? 12 : 6
      const [resMetriques, resTendances] = await Promise.all([
        api.get<any>(metriquesUrl),
        api.get<any>(`/api/dashboard/tendances-mensuelles?nbMois=${nbMois}`),
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
    if (periodePreset === "personnalise") {
      setLoading(false)
      return
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodePreset])

  if (loading || !data) {
    return (
      <DashboardPageShell contentClassName="gap-8 pb-10 pt-2">
      <DashboardPageHeader
        title="Tableau de bord"
        description="Vue d’ensemble de vos finances"
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={periodePreset}
              onValueChange={(v) => setPeriodePreset(v as PeriodePreset)}
            >
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-52">
                <CalendarRange className="mr-2 size-4 shrink-0 opacity-60" />
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mois">Ce mois-ci</SelectItem>
                <SelectItem value="mois_precedent">Dernier mois</SelectItem>
                <SelectItem value="trimestre">3 mois (glissant)</SelectItem>
                <SelectItem value="semestre">6 mois (glissant)</SelectItem>
                <SelectItem value="annee">Année en cours</SelectItem>
                <SelectItem value="personnalise">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
            {periodePreset === "personnalise" && (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  className="h-10 w-40 rounded-xl"
                  value={dateDebutCustom}
                  onChange={(e) => setDateDebutCustom(e.target.value)}
                />
                <span className="text-muted-foreground text-sm">au</span>
                <Input
                  type="date"
                  className="h-10 w-40 rounded-xl"
                  value={dateFinCustom}
                  onChange={(e) => setDateFinCustom(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-10 rounded-xl"
                  disabled={!dateDebutCustom || !dateFinCustom}
                  onClick={() => loadData()}
                >
                  Appliquer
                </Button>
              </div>
            )}
          </div>
        }
      />
      <div className="space-y-8">
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
      </DashboardPageShell>
    )
  }

  const { metriques, repartitionDepenses, repartitionRevenus, evolutionSolde, periode } = data
  const periodeStr =
    periode?.dateDebut && periode?.dateFin
      ? formatPeriodeLabel(periode.dateDebut, periode.dateFin)
      : null

  const revenusFormatter = new Intl.NumberFormat("fr-MA", { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });
  const subtitleRevenusDepenses = periodeStr
    ? `Sur la période : ${periodeStr}`
    : "Total sur la période sélectionnée"

  return (
    <DashboardPageShell contentClassName="gap-8 pb-10 pt-2">
      <DashboardPageHeader
        title="Tableau de bord"
        description={periodeStr ? `Période : ${periodeStr}` : "Vue d’ensemble de vos finances"}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={periodePreset}
              onValueChange={(v) => setPeriodePreset(v as PeriodePreset)}
            >
              <SelectTrigger className="h-10 w-full rounded-xl sm:w-52">
                <CalendarRange className="mr-2 size-4 shrink-0 opacity-60" />
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mois">Ce mois-ci</SelectItem>
                <SelectItem value="mois_precedent">Dernier mois</SelectItem>
                <SelectItem value="trimestre">3 mois (glissant)</SelectItem>
                <SelectItem value="semestre">6 mois (glissant)</SelectItem>
                <SelectItem value="annee">Année en cours</SelectItem>
                <SelectItem value="personnalise">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
            {periodePreset === "personnalise" && (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  className="h-10 w-40 rounded-xl"
                  value={dateDebutCustom}
                  onChange={(e) => setDateDebutCustom(e.target.value)}
                />
                <span className="text-muted-foreground text-sm">au</span>
                <Input
                  type="date"
                  className="h-10 w-40 rounded-xl"
                  value={dateFinCustom}
                  onChange={(e) => setDateFinCustom(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-10 rounded-xl"
                  disabled={!dateDebutCustom || !dateFinCustom}
                  onClick={() => loadData()}
                >
                  Appliquer
                </Button>
              </div>
            )}
          </div>
        }
      />
      <div className="space-y-8">
      {errorMsg && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md font-medium">
          Détail pour le développeur: {errorMsg}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FluxCardSolde
          title="Solde actuel"
          value={revenusFormatter.format(metriques?.solde || 0)}
          subtitle="Total de vos fonds disponibles"
          icon={Wallet}
          positive
        />
        <FluxCardEntrees
          title="Revenus"
          value={revenusFormatter.format(metriques?.revenus || 0)}
          subtitle={subtitleRevenusDepenses}
          icon={ArrowUpCircle}
        />
        <FluxCardSorties
          title="Dépenses"
          value={revenusFormatter.format(metriques?.depenses || 0)}
          subtitle={subtitleRevenusDepenses}
          icon={ArrowDownCircle}
        />
        <div className="relative overflow-hidden rounded-3xl border border-violet-500/15 bg-linear-to-br from-white to-violet-50/50 p-6 shadow-sm dark:border-violet-500/10 dark:from-zinc-900 dark:to-violet-950/20">
          <div className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
            <PiggyBank className="size-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600/90 dark:text-violet-400/90">
            Taux d&apos;épargne
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-violet-800 dark:text-violet-300 md:text-3xl">
            {(metriques?.tauxEpargne || 0).toFixed(1)}%
          </p>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Part des revenus conservée
          </p>
        </div>
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
              {periodeStr
                ? `Répartition des revenus sur la période affichée.`
                : `Répartition des revenus sur la période sélectionnée.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartRevenusCanauxBar revenusData={repartitionRevenus} />
          </CardContent>
        </Card>
      </div>
      </div>
    </DashboardPageShell>
  )
}