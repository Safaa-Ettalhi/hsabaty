"use client"

import * as React from "react"

import { TrendingUp } from "lucide-react"
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
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
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
import { ChartSoldeSparkline } from "./dashboard-charts"

const evolutionSoldeMock: Array<{ date: string; solde: number }> = [
  { date: "2024-01-05", solde: 8500 },
  { date: "2024-01-15", solde: 11200 },
  { date: "2024-01-25", solde: 9800 },
  { date: "2024-02-05", solde: 12350 },
  { date: "2024-02-15", solde: 13200 },
  { date: "2024-02-25", solde: 12840 },
  { date: "2024-03-05", solde: 14120 },
  { date: "2024-03-15", solde: 15280 },
  { date: "2024-03-25", solde: 14910 },
]

const tendancesMensuellesMock: Array<{
  label: string
  revenus: number
  depenses: number
}> = [
  { label: "Janvier", revenus: 24000, depenses: 18200 },
  { label: "Février", revenus: 25500, depenses: 19450 },
  { label: "Mars", revenus: 26800, depenses: 20120 },
]

const repartitionDepensesMock: Array<{
  categorie: string
  montant: number
  pourcentage: number
}> = [
  { categorie: "Loyer & logement", montant: 7200, pourcentage: 32.5 },
  { categorie: "Courses & alimentaire", montant: 4300, pourcentage: 19.4 },
  { categorie: "Transport", montant: 2100, pourcentage: 9.5 },
  { categorie: "Abonnements", montant: 1450, pourcentage: 6.5 },
  { categorie: "Sorties & loisirs", montant: 3200, pourcentage: 14.4 },
  { categorie: "Santé", montant: 900, pourcentage: 4.1 },
  { categorie: "Autres", montant: 3900, pourcentage: 13.6 },
]

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
  salaire: {
    label: "Salaire",
    color: "var(--chart-1)",
  },
  freelance: {
    label: "Freelance",
    color: "var(--chart-1)",
  },
  investissements: {
    label: "Investissements",
    color: "var(--chart-1)",
  },
  autres: {
    label: "Autres",
    color: "var(--chart-1)",
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

function ChartAreaSolde() {
  const chartData = evolutionSoldeMock.map((d) => ({
    month: new Date(d.date).toLocaleDateString("fr-FR", { month: "long" }),
    solde: d.solde,
  }))

  return (
    <Card className={chartCardClassName}>
      <CardHeader>
        <CardTitle>Évolution du solde</CardTitle>
        <CardDescription>
          Solde total sur les derniers mois
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer
          config={soldeAreaChartConfig}
          className="h-55 w-full"
        >
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
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
      </CardContent>
      <CardFooter className="pt-4">
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-1">
            <div className="flex items-center gap-2 leading-none font-medium">
              Tendance en hausse ce mois-ci
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground text-xs">
              Basé sur l&apos;historique récent de votre solde
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

function ChartSoldeLineLabel() {
  const chartData = evolutionSoldeMock.map((d) => ({
    month: new Date(d.date).toLocaleDateString("fr-FR", { month: "short" }),
    solde: d.solde,
  }))

  return (
    <ChartContainer config={soldeLineChartConfig}>
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          top: 20,
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: string) => value.slice(0, 3)}
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
          dot={{
            fill: "var(--chart-1)",
          }}
          activeDot={{
            r: 6,
          }}
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
    </ChartContainer>
  )
}

function ChartRadialEpargne({ valeur }: { valeur: number }) {
  const clamped = Math.min(100, Math.max(0, valeur))
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
        <CardDescription>Basé sur le mois en cours</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={tauxEpargneRadialConfig}
          className="mx-auto aspect-square max-h-62.5"
        >
          <RadialBarChart
            data={chartData}
            endAngle={100}
            innerRadius={80}
            outerRadius={140}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="pourcentage" background />
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
        <div className="flex items-center gap-2 leading-none font-medium">
          Tendance en hausse ce mois-ci{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Taux d&apos;épargne actuel estimé à {clamped.toFixed(1)} %.
        </div>
      </CardFooter>
    </Card>
  )
}

function ChartDepensesPieInteractive() {
  const top = repartitionDepensesMock.slice(0, 5)
  const opacities = [0.9, 0.7, 0.5, 0.35, 0.2]
  const pieData = top.map((item, index) => ({
    categorie: item.categorie,
    montant: item.montant,
    // Variations of primary #533AFD with different opacities
    fill: `rgba(83, 58, 253, ${opacities[index] ?? 0.2})`,
  }))

  const total = pieData.reduce((sum, item) => sum + item.montant, 0)

  return (
    <Card className={`flex flex-col ${chartCardClassName}`}>
      <CardHeader className="items-center pb-0">
        <CardTitle>Répartition des dépenses</CardTitle>
        <CardDescription>
          Principales catégories sur la période sélectionnée
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={depensesPieConfig}
          className="mx-auto aspect-square max-h-55 pb-0"
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
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm items-start text-left">
        <div className="flex items-center gap-2 leading-none font-medium">
          Vos postes de dépenses les plus importants
        </div>
        <div className="leading-none text-muted-foreground">
          Utile pour identifier les leviers d&apos;optimisation dans Hssabaty.
        </div>
      </CardFooter>
    </Card>
  )
}

function ChartRevenusDepensesStacked() {
  const chartData = [
    { mois: "Janvier", revenus: 24000, depenses: 18200 },
    { mois: "Février", revenus: 25500, depenses: 19450 },
    { mois: "Mars", revenus: 26800, depenses: 20120 },
    { mois: "Avril", revenus: 26000, depenses: 19800 },
    { mois: "Mai", revenus: 27250, depenses: 20500 },
    { mois: "Juin", revenus: 28500, depenses: 21400 },
  ]

  return (
    <ChartContainer
      config={revenusDepensesBarConfig}
      className="mx-auto max-w-xl"
    >
      <BarChart accessibilityLayer data={chartData}>
        <XAxis
          dataKey="mois"
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
    </ChartContainer>
  )
}

function ChartRevenusCanauxBar() {
  const chartData = [
    { canal: "salaire", montant: 42000, fill: "rgba(83, 58, 253, 0.9)" },
    { canal: "freelance", montant: 12500, fill: "rgba(83, 58, 253, 0.7)" },
    { canal: "investissements", montant: 8300, fill: "rgba(83, 58, 253, 0.5)" },
    { canal: "autres", montant: 4100, fill: "rgba(83, 58, 253, 0.3)" },
  ]

  return (
    <ChartContainer config={revenusCanauxConfig}>
      <BarChart
        accessibilityLayer
        data={chartData}
        layout="vertical"
        margin={{
          left: 0,
        }}
      >
        <YAxis
          dataKey="canal"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) =>
            revenusCanauxConfig[value as keyof typeof revenusCanauxConfig]
              ?.label ?? value
          }
        />
        <XAxis dataKey="montant" type="number" hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="montant" layout="vertical" radius={5} />
      </BarChart>
    </ChartContainer>
  )
}

export function DashboardClient() {
  // const currentSolde = evolutionSoldeMock[evolutionSoldeMock.length - 1]?.solde ?? 0
  // const previousSolde =
    // evolutionSoldeMock[evolutionSoldeMock.length - 2]?.solde ?? currentSolde
  // const soldeDiff = currentSolde - previousSolde
  // const soldeDiffPct =
  //   previousSolde > 0 ? (soldeDiff / previousSolde) * 100 : 0

  const dernierMois = tendancesMensuellesMock[tendancesMensuellesMock.length - 1]
  const revenusMois = dernierMois?.revenus ?? 0
  const depensesMois = dernierMois?.depenses ?? 0
  const tauxEpargne =
    revenusMois > 0 ? ((revenusMois - depensesMois) / revenusMois) * 100 : 0

  // const avantDernierMois =
  //   tendancesMensuellesMock[tendancesMensuellesMock.length - 2] ?? dernierMois
  // const revenusMoisPrec = avantDernierMois?.revenus ?? revenusMois
  // const depensesMoisPrec = avantDernierMois?.depenses ?? depensesMois
  // const tauxEpargnePrec =
  //   revenusMoisPrec > 0
  //     ? ((revenusMoisPrec - depensesMoisPrec) / revenusMoisPrec) * 100
  //     : tauxEpargne

  // const revenusMoisDiffPct =
  //   revenusMoisPrec > 0 ? ((revenusMois - revenusMoisPrec) / revenusMoisPrec) * 100 : 0
  // const depensesMoisDiffPct =
  //   depensesMoisPrec > 0
  //     ? ((depensesMois - depensesMoisPrec) / depensesMoisPrec) * 100
  //     : 0
  // const tauxEpargneDiffPct = tauxEpargnePrec !== 0 ? tauxEpargne - tauxEpargnePrec : 0

  return (
    <div className="space-y-8 pb-10 pt-4 px-4 md:px-6">
      {/* Cartes KPI style dashboard-01 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Revenus totaux</CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl tabular-nums">$1,250.00</CardTitle>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                ↗ +12.5%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="font-medium text-foreground">En hausse ce mois-ci</p>
            <p className="text-muted-foreground">
              Données des 6 derniers mois
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Nouveaux clients</CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl tabular-nums">1,234</CardTitle>
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/5 px-2 py-0.5 text-[11px] font-medium text-red-500">
                ↘ -20%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="font-medium text-foreground">En baisse de 20 % sur la période</p>
            <p className="text-muted-foreground">L&apos;acquisition nécessite une attention particulière</p>
          </CardContent>
        </Card>

        <Card className="border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Comptes actifs</CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl tabular-nums">45,678</CardTitle>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                ↗ +12.5%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="font-medium text-foreground">Forte rétention des utilisateurs</p>
            <p className="text-muted-foreground">L&apos;engagement dépasse les objectifs</p>
          </CardContent>
        </Card>

        <Card className="border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5">
          <CardHeader className="pb-2">
            <CardDescription>Taux de croissance</CardDescription>
            <div className="flex items-baseline justify-between gap-2">
              <CardTitle className="text-2xl tabular-nums">4.5%</CardTitle>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
                ↗ +4.5%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="font-medium text-foreground">Performance stable</p>
            <p className="text-muted-foreground">Conforme aux prévisions de croissance</p>
          </CardContent>
        </Card>
      </div>

      {/* Zone principale : évolution + répartition */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ChartAreaSolde />

          <Card className={chartCardClassName}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Solde global sur la période
              </CardTitle>
              <CardDescription>
                Vue lissée de l&apos;évolution de votre solde global.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartSoldeLineLabel />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ChartRadialEpargne valeur={tauxEpargne} />
          <ChartDepensesPieInteractive />
        </div>
      </div>

      {/* Tendances revenus / dépenses + autre vue */}
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
            <ChartRevenusDepensesStacked />
          </CardContent>
        </Card>

        <Card className={chartCardClassName}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Top canaux de revenus
            </CardTitle>
            <CardDescription>
              Répartition des revenus par source principale.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartRevenusCanauxBar />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}