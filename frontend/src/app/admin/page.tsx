"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Users, UserPlus, Shield } from "lucide-react"
import { FluxCardSolde } from "@/components/flux-kpi-cards"
import { cn } from "@/lib/utils"

type Stats = {
  utilisateurs: {
    total: number
    nouveauxMois: number
    nouveauxAnnee: number
    evolution: { mois: string; nombre: number }[]
  }
}

const chartConfig = {
  inscriptions: {
    label: "Inscriptions",
    color: "hsl(var(--chart-1))",
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
      }>("/api/admin/statistiques")
      .then((res) => {
        if (res.succes && res.donnees) {
          setData({
            utilisateurs: res.donnees.utilisateurs,
          })
        } else setError(res.message || "Erreur")
      })
  }, [])

  if (error) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      </DashboardPageShell>
    )
  }

  if (!data) {
    return (
      <DashboardPageShell>
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </DashboardPageShell>
    )
  }

  const evolutionChart = data.utilisateurs.evolution.map((e) => ({
    mois: new Date(e.mois).toLocaleDateString("fr-FR", { month: "short" }),
    inscriptions: e.nombre,
  }))

  return (
    <DashboardPageShell>
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
            <Shield className="size-3.5" />
            Administration
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
            Tableau de bord
          </h1>
          <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400 md:text-base">
            Vue globale des comptes utilisateurs et de l&apos;activité d&apos;inscription.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FluxCardSolde
          title="Utilisateurs inscrits"
          value={data.utilisateurs.total}
          subtitle={`+${data.utilisateurs.nouveauxAnnee} cette année`}
          icon={Users}
        />
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm transition-shadow hover:shadow-md"
          )}
        >
          <div className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary">
            <UserPlus className="size-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/90 dark:text-primary">
            Nouveaux ce mois
          </p>
          <div className="mt-2 text-2xl font-bold tabular-nums text-primary dark:text-primary md:text-3xl">
            {data.utilisateurs.nouveauxMois}
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Inscriptions sur le mois en cours
          </p>
        </div>
      </div>

      <Card className={chartCardClassName}>
        <CardHeader>
          <CardTitle>Inscriptions sur 6 mois</CardTitle>
          <CardDescription>
            Nombre de nouveaux comptes par mois
          </CardDescription>
        </CardHeader>
        <CardContent className="pl-0">
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <BarChart accessibilityLayer data={evolutionChart}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="mois"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="inscriptions"
                fill="var(--color-inscriptions)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}
