/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, LabelList } from "recharts"
import { ArrowDownCircle, ArrowUpCircle, Wallet, CalendarDays, BarChart3 } from "lucide-react"

import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
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
      .get<FluxData>(`/api/rapports/flux-tresorerie${params.toString() ? '?' + params : ""}`)
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
  
  // Emerald scale
  const emeraldOpacities = [0.95, 0.8, 0.65, 0.5, 0.35, 0.2]
  // Rose scale
  const roseOpacities = [0.95, 0.8, 0.65, 0.5, 0.35, 0.2]

  const revenusData = (data?.sources ?? [])
    .sort((a, b) => b.montant - a.montant)
    .map((s, idx) => ({
      label: s.nom,
      montant: s.montant,
      fill: `rgba(16, 185, 129, ${emeraldOpacities[idx % emeraldOpacities.length]})`, // emerald-500
    }))

  const depensesData = (data?.categories ?? [])
    .sort((a, b) => b.montant - a.montant)
    .map((c, idx) => ({
      label: c.nom,
      montant: c.montant,
      fill: `rgba(244, 63, 94, ${roseOpacities[idx % roseOpacities.length]})`, // rose-500
    }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 md:pt-6 bg-zinc-50/50 dark:bg-zinc-950/20 min-h-full">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Trésorerie</h1>
          <p className="text-zinc-500 mt-1 block">Visualisez la provenance et la destination de chaque centime.</p>
        </div>
        
        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1.5 shadow-sm">
          <CalendarDays className="size-4 text-zinc-400 ml-1" />
          <Input
            type="date"
            className="h-8 border-none shadow-none text-xs w-30 focus-visible:ring-0"
            value={dateDebut}
            onChange={(e) => setDateDebut(e.target.value)}
            title="Date début"
          />
          <span className="text-zinc-300">-</span>
          <Input
            type="date"
            className="h-8 border-none shadow-none text-xs w-30 focus-visible:ring-0"
            value={dateFin}
            onChange={(e) => setDateFin(e.target.value)}
            title="Date fin"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm p-4 rounded-xl font-medium shadow-sm">
          Erreur: {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-6 mt-2">
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-100 w-full rounded-3xl" />
            <Skeleton className="h-100 w-full rounded-3xl" />
          </div>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center p-16 text-center h-100 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl">
          <div className="size-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5 border border-zinc-200 dark:border-zinc-700">
             <BarChart3 className="size-8 text-zinc-400" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Aucune donnée disponible</h3>
          <p className="text-zinc-500 max-w-sm mx-auto text-sm leading-relaxed">
            Il n&apos;y a eu aucun mouvement détecté sur cette période. Modifiez les dates pour voir votre analyse.
          </p>
        </div>
      ) : (
        <div className="space-y-6 mt-2">
          
          {/* KPI DASHBOARD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ArrowUpCircle className="size-24" />
              </div>
              <p className="text-sm font-medium text-emerald-700/80 dark:text-emerald-400/80 mb-1">Masse Entrante</p>
              <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">+{formatter.format(totalRevenus)}</h3>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 border border-white"></span> Totalité de vos sources
              </div>
            </div>
            
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ArrowDownCircle className="size-24" />
              </div>
              <p className="text-sm font-medium text-rose-700/80 dark:text-rose-400/80 mb-1">Masse Sortante</p>
              <h3 className="text-3xl font-bold text-rose-600 dark:text-rose-400">-{formatter.format(totalDepenses)}</h3>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-500 border border-white"></span> Totalité de vos dépenses
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-950 p-5 shadow-sm text-white">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Wallet className="size-24" />
              </div>
              <p className="text-sm font-medium text-zinc-300 mb-1">Épargne Nette Périodique</p>
              <h3 className="text-3xl font-bold text-white">{data.epargne > 0 ? '+' : ''}{formatter.format(data.epargne)}</h3>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                <span className={cn("w-2 h-2 rounded-full", data.epargne >= 0 ? "bg-emerald-400" : "bg-rose-400")}></span> 
                {data.epargne >= 0 ? 'Capacité de financement dégagée' : 'Déficit sur la période'}
              </div>
            </div>
          </div>

          {/* CHARTS CONTAINER */}
          <div className="grid gap-6 lg:grid-cols-2">
            
            {/* INCOMES CHART */}
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Origine des Fonds</h3>
                <p className="text-sm text-zinc-500">Répartition par source de revenus, classée par importance.</p>
              </div>
              
              <div className="flex-1">
                {revenusData.length > 0 ? (
                  <ChartContainer
                    config={revenusChartConfig}
                    className="min-h-75 w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={revenusData}
                      layout="vertical"
                      margin={{ left: 0, right: 30 }}
                    >
                      <CartesianGrid vertical={false} horizontal={true} strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={110}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        className="text-xs font-semibold fill-zinc-600 dark:fill-zinc-300"
                      />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                        content={<ChartTooltipContent 
                          indicator="dot"
                          formatter={(value) => [formatter.format(Number(value)), "Montant"]}
                        />}
                      />
                      <Bar
                        dataKey="montant"
                        layout="vertical"
                        radius={[0, 6, 6, 0]}
                        barSize={24}
                      >
                        {revenusData.map((entry, index) => (
                          <Cell key={`cell-rev-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList 
                          dataKey="montant" 
                          position="right" 
                          formatter={(val: number) => formatter.format(val)}
                          className="fill-zinc-400 dark:fill-zinc-500 text-[11px] font-bold"
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 flex h-75 items-center justify-center rounded-2xl text-sm font-medium text-zinc-400 border border-zinc-100 dark:border-zinc-800">
                    Aucune entrée
                  </div>
                )}
              </div>
            </div>

            {/* EXPENSES CHART */}
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">Destination des Fonds</h3>
                <p className="text-sm text-zinc-500">Répartition par catégorie de dépenses, classée par poids.</p>
              </div>
              
              <div className="flex-1">
                {depensesData.length > 0 ? (
                  <ChartContainer
                    config={depensesChartConfig}
                    className="min-h-75 w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={depensesData}
                      layout="vertical"
                      margin={{ left: 0, right: 30 }}
                    >
                      <CartesianGrid vertical={false} horizontal={true} strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={110}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        className="text-xs font-semibold fill-zinc-600 dark:fill-zinc-300 capitalize"
                      />
                      <ChartTooltip
                        cursor={{ fill: 'rgba(244, 63, 94, 0.05)' }}
                        content={<ChartTooltipContent 
                          indicator="dot"
                          formatter={(value) => [formatter.format(Number(value)), "Montant"]}
                        />}
                      />
                      <Bar
                        dataKey="montant"
                        layout="vertical"
                        radius={[0, 6, 6, 0]}
                        barSize={24}
                      >
                        {depensesData.map((entry, index) => (
                          <Cell key={`cell-dep-${index}`} fill={entry.fill} />
                        ))}
                        <LabelList 
                          dataKey="montant" 
                          position="right" 
                          formatter={(val: number) => formatter.format(val)}
                          className="fill-zinc-400 dark:fill-zinc-500 text-[11px] font-bold"
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 flex h-75 items-center justify-center rounded-2xl text-sm font-medium text-zinc-400 border border-zinc-100 dark:border-zinc-800">
                    Aucune sortie
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
