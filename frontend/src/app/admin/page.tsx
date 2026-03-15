"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Area, AreaChart, CartesianGrid, XAxis, PieChart, Pie } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Users, ArrowUpCircle, ArrowDownCircle, Banknote, MessageSquare } from "lucide-react"
import { FluxCardSolde, FluxCardEntrees, FluxCardSorties } from "@/components/flux-kpi-cards"

type Stats = {
  utilisateurs: {
    total: number
    nouveauxMois: number
    nouveauxAnnee: number
    evolution: { mois: string; nombre: number }[]
  }
  transactions: {
    total: number
    ceMois: number
    revenusMois: number
    depensesMois: number
    topCategories: { categorie: string; montant: number }[]
  }
  budgets: {
    total: number
    actifs: number
  }
  objectifs: {
    total: number
    actifs: number
  }
  ia: {
    totalMessages: number
    totalConversations: number
    messagesMois: number
  }
}

const chartConfig = {
  inscriptions: {
    label: "Inscriptions",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const depensesPieConfig = {
  montant: {
    label: "Montant dépensé",
  },
} satisfies ChartConfig

const chartCardClassName =
  "border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5 rounded-2xl"

export default function AdminDashboardPage() {
  const [data, setData] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminApi
      .get<{
        utilisateurs: Stats["utilisateurs"]
        transactions: Stats["transactions"]
        budgets: Stats["budgets"]
        objectifs: Stats["objectifs"]
      }>("/api/admin/statistiques")
      .then((res) => {
        if (res.succes && res.donnees) {
          setData(res.donnees as Stats)
        } else setError(res.message || "Erreur")
      })
  }, [])

  if (error) {
    return (
      <DashboardPageShell contentClassName="gap-8 pb-10 pt-2">
        <DashboardPageHeader
          title="Tableau de bord"
          description="Vue globale d'administration"
        />
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      </DashboardPageShell>
    )
  }

  if (!data) {
    return (
      <DashboardPageShell contentClassName="gap-8 pb-10 pt-2">
        <DashboardPageHeader
           title="Tableau de bord"
           description="Chargement..."
        />
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
               <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </DashboardPageShell>
    )
  }

  const evolutionChart = data.utilisateurs.evolution.map((e) => ({
    mois: new Date(e.mois).toLocaleDateString("fr-FR", { month: "long" }),
    inscriptions: e.nombre,
  }))

  const topCategoriesData = (data.transactions.topCategories || []).map((item, index) => {
    const opacities = [0.9, 0.7, 0.5, 0.35, 0.2]
    return {
      categorie: item.categorie,
      montant: item.montant,
      fill: `rgba(83, 58, 253, ${opacities[index] ?? 0.2})`,
    }
  })
  const totalCatMontant = topCategoriesData.reduce((sum, i) => sum + i.montant, 0)

  const revenusFormatter = new Intl.NumberFormat("fr-MA", { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });

  return (
    <DashboardPageShell contentClassName="gap-8 pb-10 pt-2">
      <DashboardPageHeader
        title="Tableau de bord Admin"
        description="Vue globale d'administration et d'activité"
      />

      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <FluxCardSolde
            title="Utilisateurs inscrits"
            value={data.utilisateurs.total}
            subtitle={`+${data.utilisateurs.nouveauxAnnee} cette année`}
            icon={Users}
            positive
          />
          <FluxCardEntrees
            title="Revenus Utilisateurs"
            value={revenusFormatter.format(data.transactions.revenusMois)}
            subtitle="Sur le mois en cours"
            icon={ArrowUpCircle}
          />
          <FluxCardSorties
            title="Dépenses Utilisateurs"
            value={revenusFormatter.format(data.transactions.depensesMois)}
            subtitle="Sur le mois en cours"
            icon={ArrowDownCircle}
          />
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/15 bg-linear-to-br from-white to-violet-50/50 p-6 shadow-sm dark:border-violet-500/10 dark:from-zinc-900 dark:to-violet-950/20">
            <div className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
              <Banknote className="size-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600/90 dark:text-violet-400/90">
              Budgets Créés
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-violet-800 dark:text-violet-300 md:text-3xl">
              {data.budgets.actifs} / {data.budgets.total}
            </p>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Actifs sur le total global
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-linear-to-br from-white to-emerald-50/50 p-6 shadow-sm dark:border-emerald-500/10 dark:from-zinc-900 dark:to-emerald-950/20">
            <div className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <MessageSquare className="size-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90 dark:text-emerald-400/90">
              Volume Requêtes IA
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-400 md:text-3xl">
              {data.ia.totalMessages} req.
            </p>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              {data.ia.messagesMois} ce mois-ci ({data.ia.totalConversations} sessions)
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className={chartCardClassName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Évolution des inscriptions</CardTitle>
                <CardDescription>
                  Inscriptions d&apos;utilisateurs sur les 6 derniers mois
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {evolutionChart.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-64 w-full">
                      <AreaChart accessibilityLayer data={evolutionChart} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="mois"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => typeof value === "string" ? value.slice(0, 3) : value}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        <Area
                          dataKey="inscriptions"
                          type="natural"
                          fill="var(--color-inscriptions)"
                          fillOpacity={0.4}
                          stroke="var(--color-inscriptions)"
                        />
                      </AreaChart>
                    </ChartContainer>
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    Données insuffisantes
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className={`flex flex-col ${chartCardClassName}`}>
              <CardHeader className="items-center pb-0">
                <CardTitle className="text-base">Top dépenses (Globales)</CardTitle>
                <CardDescription>Principales catégories utilisateurs</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                {topCategoriesData.length > 0 ? (
                  <>
                    <ChartContainer
                      config={depensesPieConfig}
                      className="mx-auto aspect-square max-h-56 pb-0"
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                          data={topCategoriesData}
                          dataKey="montant"
                          nameKey="categorie"
                          label={false}
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="mt-4 grid gap-1.5 text-xs">
                      {topCategoriesData.map((item) => {
                        const pct = totalCatMontant ? ((item.montant / totalCatMontant) * 100).toFixed(1) : "0.0"
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
                    Aucune dépense recensée ce mois
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm items-start text-left mt-2 pb-4">
                <div className="leading-none text-muted-foreground text-center w-full">
                  Catégories les plus populaires du mois en cours.
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </DashboardPageShell>
  )
}
