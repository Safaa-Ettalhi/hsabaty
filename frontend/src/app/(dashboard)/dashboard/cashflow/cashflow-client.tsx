/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList } from "recharts"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  CalendarDays,
  BarChart3,
  Sparkles,
  TrendingUp,
  GitBranch,
} from "lucide-react"

import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { SankeyFlux } from "@/components/sankey-flux"

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function subMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() - n, Math.min(d.getDate(), 28))
}
function formatPeriodShort(from: string, to: string) {
  const a = new Date(from)
  const b = new Date(to)
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  const aStr = a.toLocaleDateString("fr-FR", opts)
  const bStr = b.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })
  return `${aStr} – ${bStr}`
}

type FluxData = {
  sources: Array<{ nom: string; montant: number }>
  categories: Array<{ nom: string; montant: number }>
  epargne: number
  sankey?: {
    nodes: Array<{ id: string; name: string }>
    links: Array<{ source: string; target: string; value: number }>
  }
}

const revenusChartConfig = {
  montant: { label: "Revenus" },
} satisfies ChartConfig

const depensesChartConfig = {
  montant: { label: "Dépenses" },
} satisfies ChartConfig

function toInputDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

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
      .get<FluxData & { periode?: unknown }>(
        `/api/rapports/flux-tresorerie${params.toString() ? "?" + params : ""}`
      )
      .then((res) => {
        if (res.succes && res.donnees) {
          const d = res.donnees as FluxData
          setData({
            sources: d.sources ?? [],
            categories: d.categories ?? [],
            epargne: d.epargne ?? 0,
            sankey: d.sankey,
          })
        } else {
          setErrorMsg("Erreur de récupération: " + res.message)
        }
      })
      .catch((e: any) => {
        setErrorMsg(e.message || "Erreur réseau inconnue")
      })
      .finally(() => setLoading(false))
  }, [dateDebut, dateFin])

  const formatter = new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  })

  const totalRevenus = data?.sources?.reduce((s, x) => s + x.montant, 0) ?? 0
  const totalDepenses = data?.categories?.reduce((s, x) => s + x.montant, 0) ?? 0
  const pctDepenses =
    totalRevenus > 0 ? Math.round((totalDepenses / totalRevenus) * 100) : 0

  const emeraldOpacities = [0.95, 0.82, 0.68, 0.54, 0.4, 0.28]
  const roseOpacities = [0.95, 0.82, 0.68, 0.54, 0.4, 0.28]

  const revenusData = (data?.sources ?? [])
    .sort((a, b) => b.montant - a.montant)
    .map((s, idx) => ({
      label: s.nom,
      montant: s.montant,
      fill: `rgba(16, 185, 129, ${emeraldOpacities[idx % emeraldOpacities.length]})`,
    }))

  const depensesData = (data?.categories ?? [])
    .sort((a, b) => b.montant - a.montant)
    .map((c, idx) => ({
      label: c.nom,
      montant: c.montant,
      fill: `rgba(244, 63, 94, ${roseOpacities[idx % roseOpacities.length]})`,
    }))

  const applyPreset = (preset: "mois" | "moisPrec" | "3mois") => {
    const now = new Date()
    if (preset === "mois") {
      setDateDebut(toInputDate(startOfMonth(now)))
      setDateFin(toInputDate(endOfMonth(now)))
    } else if (preset === "moisPrec") {
      const d = subMonths(now, 1)
      setDateDebut(toInputDate(startOfMonth(d)))
      setDateFin(toInputDate(endOfMonth(d)))
    } else {
      const debut = subMonths(startOfMonth(now), 2)
      setDateDebut(toInputDate(debut))
      setDateFin(toInputDate(endOfMonth(now)))
    }
  }

  const periodeLabel =
    dateDebut && dateFin ? formatPeriodShort(dateDebut, dateFin) : "Mois en cours"

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      {/* Fond décoratif */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl dark:bg-primary/10" />
        <div className="absolute -right-32 top-48 h-96 w-96 rounded-full bg-primary/5 blur-3xl dark:bg-primary/10" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[80%] -translate-x-1/2 rounded-full bg-rose-500/5 blur-3xl" />
      </div>

      <div className="flex flex-1 flex-col gap-8 p-4 pb-10 md:gap-10 md:p-8 md:pt-6">
        {/* HEADER */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
              <GitBranch className="size-3.5" />
              Flux de trésorerie
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
              Où va votre argent
            </h1>
            <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400 md:text-base">
              Visualisez en un coup d&apos;œil les entrées, les sorties et ce qui reste sur la période
              choisie — diagramme Sankey et détail par catégorie.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-zinc-200 bg-white/80 text-xs font-medium shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80"
                onClick={() => applyPreset("mois")}
              >
                Ce mois
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-zinc-200 bg-white/80 text-xs font-medium shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80"
                onClick={() => applyPreset("moisPrec")}
              >
                Mois dernier
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-zinc-200 bg-white/80 text-xs font-medium shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80"
                onClick={() => applyPreset("3mois")}
              >
                3 mois
              </Button>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
              <CalendarDays className="size-4 shrink-0 text-zinc-400" />
              <div className="flex items-center gap-1.5">
                <span className="hidden text-[10px] font-medium uppercase tracking-wider text-zinc-400 sm:inline">
                  Du
                </span>
                <Input
                  type="date"
                  className="h-8 w-38 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0 dark:bg-transparent"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  title="Date début"
                />
                <span className="text-zinc-300">→</span>
                <span className="hidden text-[10px] font-medium uppercase tracking-wider text-zinc-400 sm:inline">
                  Au
                </span>
                <Input
                  type="date"
                  className="h-8 w-38 border-0 bg-transparent text-xs shadow-none focus-visible:ring-0 dark:bg-transparent"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  title="Date fin"
                />
              </div>
            </div>
          </div>
        </header>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton
                  key={i}
                  className="h-36 w-full rounded-3xl bg-zinc-200/80 dark:bg-zinc-800/80"
                />
              ))}
            </div>
            <Skeleton className="h-105 w-full rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-96 w-full rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
              <Skeleton className="h-96 w-full rounded-3xl bg-zinc-200/60 dark:bg-zinc-800/60" />
            </div>
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-white/60 px-8 py-20 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-linear-to-br from-zinc-100 to-zinc-50 shadow-inner dark:from-zinc-800 dark:to-zinc-900">
              <BarChart3 className="size-10 text-zinc-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Aucune donnée sur cette période
            </h3>
            <p className="mb-6 max-w-md text-sm text-zinc-500">
              Changez les dates ou enregistrez des transactions pour voir le flux de trésorerie et le
              diagramme Sankey.
            </p>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => applyPreset("mois")}
            >
              Voir le mois en cours
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Période active */}
            <p className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Période affichée : <span className="text-zinc-800 dark:text-zinc-200">{periodeLabel}</span>
            </p>

            {/* KPI */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="group relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-linear-to-br from-white to-emerald-50/50 p-6 shadow-sm transition-shadow hover:shadow-md dark:border-emerald-500/10 dark:from-zinc-900 dark:to-emerald-950/20">
                <div className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <ArrowUpCircle className="size-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90 dark:text-emerald-400/90">
                  Entrées
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 md:text-3xl">
                  +{formatter.format(totalRevenus)}
                </p>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  Total des revenus sur la période
                </p>
              </div>

              <div className="group relative overflow-hidden rounded-3xl border border-rose-500/15 bg-linear-to-br from-white to-rose-50/50 p-6 shadow-sm transition-shadow hover:shadow-md dark:border-rose-500/10 dark:from-zinc-900 dark:to-rose-950/20">
                <div className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                  <ArrowDownCircle className="size-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-600/90 dark:text-rose-400/90">
                  Sorties
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-400 md:text-3xl">
                  −{formatter.format(totalDepenses)}
                </p>
                {totalRevenus > 0 && (
                  <p className="mt-3 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <TrendingUp className="size-3" />
                    {pctDepenses}% des entrées
                  </p>
                )}
              </div>

              <div
                className={cn(
                  "relative overflow-hidden rounded-3xl border p-6 shadow-sm transition-shadow hover:shadow-md",
                  data.epargne >= 0
                    ? "border-primary/20 bg-primary text-primary-foreground"
                    : "border-amber-500/20 bg-linear-to-br from-amber-600 to-orange-700 text-white"
                )}
              >
                <div
                  className={cn(
                    "absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl",
                    data.epargne >= 0
                      ? "bg-white/20 text-white"
                      : "bg-white/20 text-white"
                  )}
                >
                  <Wallet className="size-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                  Solde période
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums md:text-3xl">
                  {data.epargne >= 0 ? "+" : ""}
                  {formatter.format(data.epargne)}
                </p>
                <p className="mt-3 text-xs text-white/75">
                  {data.epargne >= 0
                    ? "Reste après dépenses (épargne nette)"
                    : "Déficit : dépenses supérieures aux revenus"}
                </p>
              </div>
            </div>

            {/* SANKEY */}
            {data.sankey &&
              data.sankey.nodes?.length > 0 &&
              data.sankey.links?.length > 0 && (
                <section className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                  <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                          <Sparkles className="size-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            Carte des flux (Sankey)
                          </h2>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Largeur des flux = montant · survol pour le détail
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-sm bg-emerald-500" />
                          Revenus
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-sm bg-violet-500" />
                          Flux central
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-sm bg-rose-500" />
                          Dépenses
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-sm bg-sky-500" />
                          Épargne
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-linear-to-b from-zinc-50/50 to-white px-4 py-6 dark:from-zinc-950/30 dark:to-zinc-900/30 md:px-6">
                    <SankeyFlux
                      nodes={data.sankey.nodes}
                      links={data.sankey.links}
                      height={400}
                      formatValue={(n) => formatter.format(n)}
                    />
                  </div>
                </section>
              )}

            {/* BAR CHARTS */}
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Détail par catégorie
              </h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="flex flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                  <div className="border-b border-emerald-500/10 bg-emerald-50/50 px-6 py-4 dark:border-emerald-500/10 dark:bg-emerald-950/20">
                    <h3 className="font-bold text-emerald-700 dark:text-emerald-400">
                      Origine des fonds
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Sources de revenus, triées par montant
                    </p>
                  </div>
                  <div className="flex-1 p-6">
                    {revenusData.length > 0 ? (
                      <ChartContainer
                        config={revenusChartConfig}
                        className="min-h-70 w-full"
                      >
                        <BarChart
                          accessibilityLayer
                          data={revenusData}
                          layout="vertical"
                          margin={{ left: 4, right: 36, top: 8, bottom: 8 }}
                        >
                          <CartesianGrid
                            horizontal
                            vertical={false}
                            strokeDasharray="3 3"
                            className="stroke-zinc-200 dark:stroke-zinc-800"
                          />
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={100}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className="text-[11px] font-medium fill-zinc-600 dark:fill-zinc-300"
                          />
                          <ChartTooltip
                            cursor={{ fill: "rgba(16, 185, 129, 0.06)" }}
                            content={
                              <ChartTooltipContent
                                indicator="dot"
                                formatter={(value) => [
                                  formatter.format(Number(value)),
                                  "Montant",
                                ]}
                              />
                            }
                          />
                          <Bar
                            dataKey="montant"
                            layout="vertical"
                            radius={[0, 8, 8, 0]}
                            barSize={22}
                          >
                            {revenusData.map((entry, index) => (
                              <Cell key={`cell-rev-${index}`} fill={entry.fill} />
                            ))}
                            <LabelList
                              dataKey="montant"
                              position="right"
                              formatter={(val: number) => formatter.format(val)}
                              className="fill-zinc-500 text-[10px] font-semibold dark:fill-zinc-400"
                            />
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="flex h-70 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
                        Aucune entrée sur cette période
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                  <div className="border-b border-rose-500/10 bg-rose-50/50 px-6 py-4 dark:border-rose-500/10 dark:bg-rose-950/20">
                    <h3 className="font-bold text-rose-700 dark:text-rose-400">
                      Destination des fonds
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Dépenses par catégorie
                    </p>
                  </div>
                  <div className="flex-1 p-6">
                    {depensesData.length > 0 ? (
                      <ChartContainer
                        config={depensesChartConfig}
                        className="min-h-70 w-full"
                      >
                        <BarChart
                          accessibilityLayer
                          data={depensesData}
                          layout="vertical"
                          margin={{ left: 4, right: 36, top: 8, bottom: 8 }}
                        >
                          <CartesianGrid
                            horizontal
                            vertical={false}
                            strokeDasharray="3 3"
                            className="stroke-zinc-200 dark:stroke-zinc-800"
                          />
                          <XAxis type="number" hide />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={100}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className="text-[11px] font-medium capitalize fill-zinc-600 dark:fill-zinc-300"
                          />
                          <ChartTooltip
                            cursor={{ fill: "rgba(244, 63, 94, 0.06)" }}
                            content={
                              <ChartTooltipContent
                                indicator="dot"
                                formatter={(value) => [
                                  formatter.format(Number(value)),
                                  "Montant",
                                ]}
                              />
                            }
                          />
                          <Bar
                            dataKey="montant"
                            layout="vertical"
                            radius={[0, 8, 8, 0]}
                            barSize={22}
                          >
                            {depensesData.map((entry, index) => (
                              <Cell key={`cell-dep-${index}`} fill={entry.fill} />
                            ))}
                            <LabelList
                              dataKey="montant"
                              position="right"
                              formatter={(val: number) => formatter.format(val)}
                              className="fill-zinc-500 text-[10px] font-semibold dark:fill-zinc-400"
                            />
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <div className="flex h-70 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/50">
                        Aucune sortie sur cette période
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
