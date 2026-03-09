"use client"

import * as React from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  BarController,
  LineController,
  PieController,
  DoughnutController,
} from "chart.js"
import { Bar, Line, Doughnut } from "react-chartjs-2"
import { getChartColors, getChartPalette, getChartDefaults } from "@/lib/chart-theme"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  BarController,
  LineController,
  PieController,
  DoughnutController
)

const emptyState = (loading: boolean, msg = "Aucune donnée") => (
  <div className="flex h-65 items-center justify-center rounded-xl bg-muted/20 text-muted-foreground text-sm">
    {loading ? "Chargement…" : msg}
  </div>
)

export function ChartTendancesBar({
  data,
  loading,
}: {
  data: Array<{ label: string; revenus: number; depenses: number }>
  loading: boolean
}) {
  const colors = getChartColors()
  const defaults = getChartDefaults()
  if (loading || !data.length) return emptyState(loading)

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "Revenus",
        data: data.map((d) => d.revenus),
        backgroundColor: colors.chart2,
        borderRadius: 4,
      },
      {
        label: "Dépenses",
        data: data.map((d) => d.depenses),
        backgroundColor: colors.chart1,
        borderRadius: 4,
      },
    ],
  }
  const options = {
    ...defaults,
    plugins: {
      ...defaults.plugins,
      tooltip: {
        ...defaults.plugins?.tooltip,
        callbacks: {
          label: (ctx: { parsed: { y?: number } }) => `${ctx.parsed.y?.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`,
        },
      },
    },
  }
  return (
    <div className="h-65 w-full">
      <Bar data={chartData} options={options as object} />
    </div>
  )
}

export function ChartTendancesLine({
  data,
  loading,
}: {
  data: Array<{ label: string; revenus: number; depenses: number }>
  loading: boolean
}) {
  const colors = getChartColors()
  const defaults = getChartDefaults()
  if (loading || !data.length) return emptyState(loading)

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "Revenus",
        data: data.map((d) => d.revenus),
        borderColor: colors.chart2,
        backgroundColor: colors.chart2 + "20",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: colors.chart2,
      },
      {
        label: "Dépenses",
        data: data.map((d) => d.depenses),
        borderColor: colors.chart1,
        backgroundColor: colors.chart1 + "20",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: colors.chart1,
      },
    ],
  }
  const options = {
    ...defaults,
    plugins: {
      ...defaults.plugins,
      tooltip: {
        ...defaults.plugins?.tooltip,
        callbacks: {
          label: (ctx: { parsed: { y?: number } }) => `${ctx.parsed.y?.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`,
        },
      },
    },
  }
  return (
    <div className="h-60 w-full">
      <Line data={chartData} options={options as object} />
    </div>
  )
}

export function ChartTendancesStackedBar({
  data,
  loading,
}: {
  data: Array<{ label: string; revenus: number; depenses: number }>
  loading: boolean
}) {
  const colors = getChartColors()
  const defaults = getChartDefaults()
  if (loading || !data.length) return emptyState(loading)

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      { label: "Revenus", data: data.map((d) => d.revenus), backgroundColor: colors.chart2, borderRadius: 0, stack: "stack0" },
      { label: "Dépenses", data: data.map((d) => d.depenses), backgroundColor: colors.chart1, borderRadius: 0, stack: "stack0" },
    ],
  }
  const options = {
    ...defaults,
    scales: {
      ...defaults.scales,
      x: { ...defaults.scales?.x, stacked: true },
      y: { ...defaults.scales?.y, stacked: true },
    },
    plugins: {
      ...defaults.plugins,
      tooltip: {
        ...defaults.plugins?.tooltip,
        callbacks: { label: (ctx: { parsed: { y?: number } }) => `${ctx.parsed.y?.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD` },
      },
    },
  }
  return (
    <div className="h-70 w-full">
      <Bar data={chartData} options={options as object} />
    </div>
  )
}
export function ChartRepartitionPie({
  data,
  loading,
}: {
  data: Array<{ categorie: string; montant: number; pourcentage: number }>
  loading: boolean
}) {
  const palette = getChartPalette()
  const defaults = getChartDefaults()
  const slice = data.slice(0, 8)
  if (loading) {
    return (
      <div className="flex h-55 items-center justify-center rounded-lg bg-muted/30 text-muted-foreground text-sm">
        Chargement…
      </div>
    )
  }
  if (!slice.length) {
    return (
      <div className="flex h-55 items-center justify-center rounded-lg bg-muted/30 text-muted-foreground text-sm">
        Aucune dépense sur la période
      </div>
    )
  }

  const chartData = {
    labels: slice.map((r) => r.categorie),
    datasets: [
      {
        data: slice.map((r) => r.montant),
        backgroundColor: slice.map((_, i) => palette[i % palette.length]),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      ...defaults.plugins,
      tooltip: {
        ...defaults.plugins?.tooltip,
        callbacks: {
          label: (ctx: { dataset: { data: unknown[] }; parsed: number }) => {
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0)
            const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : "0"
            return `${ctx.parsed?.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD (${pct} %)`
          },
        },
      },
    },
  }
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="h-55 w-full sm:w-55">
        <Doughnut data={chartData} options={options as object} />
      </div>
      <ul className="flex-1 space-y-1.5 text-sm">
        {slice.map((r) => (
          <li key={r.categorie} className="flex justify-between gap-2">
            <span className="truncate text-muted-foreground">{r.categorie}</span>
            <span className="shrink-0 tabular-nums">
              {r.montant.toFixed(0)} MAD ({r.pourcentage.toFixed(1)} %)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ChartRepartitionHorizontalBar({
  data,
  loading,
}: {
  data: Array<{ categorie: string; montant: number; pourcentage: number }>
  loading: boolean
}) {
  const colors = getChartColors()
  const defaults = getChartDefaults()
  const slice = data.slice(0, 8)
  if (loading || !slice.length) return emptyState(loading, "Aucune dépense")

  const chartData = {
    labels: slice.map((r) => r.categorie),
    datasets: [
      {
        label: "MAD",
        data: slice.map((r) => r.montant),
        backgroundColor: colors.chart1,
        borderRadius: 4,
      },
    ],
  }
  const options = {
    ...defaults,
    indexAxis: "y" as const,
    scales: {
      x: {
        ...defaults.scales?.x,
        grid: { color: colors.border + "60" },
      },
      y: {
        ...defaults.scales?.y,
        grid: { display: false },
      },
    },
    plugins: {
      ...defaults.plugins,
      legend: { display: false },
      tooltip: {
        ...defaults.plugins?.tooltip,
        callbacks: { label: (ctx: { parsed: { x?: number } }) => `${ctx.parsed.x?.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD` },
      },
    },
  }
  return (
    <div className="h-65 w-full">
      <Bar data={chartData} options={options as object} />
    </div>
  )
}

export function ChartRevenusDepensesDualArea({
  data,
  loading,
}: {
  data: Array<{ label: string; revenus: number; depenses: number }>
  loading: boolean
}) {
  const colors = getChartColors()
  const defaults = getChartDefaults()
  if (loading || !data.length) return emptyState(loading)

  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "Revenus",
        data: data.map((d) => d.revenus),
        borderColor: colors.chart2,
        backgroundColor: colors.chart2 + "50",
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointBackgroundColor: colors.chart2,
      },
      {
        label: "Dépenses",
        data: data.map((d) => d.depenses),
        borderColor: colors.chart1,
        backgroundColor: colors.chart1 + "50",
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        pointBackgroundColor: colors.chart1,
      },
    ],
  }
  const options = {
    ...defaults,
    plugins: {
      ...defaults.plugins,
      tooltip: {
        ...defaults.plugins?.tooltip,
        callbacks: { label: (ctx: { parsed: { y?: number } }) => `${ctx.parsed.y?.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD` },
      },
    },
  }
  return (
    <div className="h-65 w-full">
      <Line data={chartData} options={options as object} />
    </div>
  )
}

export function ChartTauxEpargneRadial({ value, loading }: { value: number; loading: boolean }) {
  const colors = getChartColors()
  const clamped = Math.min(100, Math.max(0, value))
  if (loading) {
    return (
      <div className="flex h-50 flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 text-muted-foreground text-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Chargement…</span>
      </div>
    )
  }

  const chartData = {
    labels: ["Épargne", "Reste"],
    datasets: [
      {
        data: [clamped, 100 - clamped],
        backgroundColor: [colors.chart2, colors.muted],
        borderWidth: 0,
        hoverOffset: 0,
      },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "75%",
    rotation: 270,
    circumference: 360,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataIndex: number }) => (ctx.dataIndex === 0 ? `Taux d'épargne: ${clamped.toFixed(1)} %` : null),
        },
      },
    },
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-45 w-45">
        <Doughnut data={chartData} options={options as object} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums">{clamped.toFixed(1)}</span>
          <span className="text-muted-foreground text-sm">% épargne</span>
        </div>
      </div>
    </div>
  )
}

export function ChartOverallSales({
  data,
  loading,
  height = 320,
}: {
  data: Array<{ date: string; solde: number }>
  loading: boolean
  height?: number
}) {
  const colors = getChartColors()
  const defaults = getChartDefaults()
  if (loading || !data?.length) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-muted/20 text-muted-foreground text-sm" style={{ height }}>
        {loading ? "Chargement…" : "Aucune donnée"}
      </div>
    )
  }
  const chartData = {
    labels: data.map((d) => new Date(d.date).toLocaleDateString("fr-FR", { month: "short", day: "numeric", year: "numeric" })),
    datasets: [
      {
        label: "Solde",
        data: data.map((d) => d.solde),
        borderColor: colors.primary,
        backgroundColor: colors.primary + "30",
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  }
  const values = data.map((d) => d.solde)
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const padding = Math.max((dataMax - dataMin) * 0.15, 1)
  const yMin = Math.min(0, dataMin - padding)
  const yMax = dataMax + padding

  const options = {
    ...defaults,
    scales: {
      ...defaults.scales,
      y: {
        ...defaults.scales?.y,
        suggestedMin: yMin,
        suggestedMax: yMax,
      },
    },
    plugins: {
      ...defaults.plugins,
      legend: { display: false },
      tooltip: {
        ...defaults.plugins?.tooltip,
        callbacks: {
          label: (ctx: { parsed: { y?: number } }) => `Solde ${ctx.parsed.y?.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`,
        },
      },
    },
  }
  return (
    <div style={{ height }} className="w-full">
      <Line data={chartData} options={options as object} />
    </div>
  )
}

export function ChartSoldeSparkline({
  data,
  height = 56,
}: {
  data: Array<{ date: string; solde: number }>
  height?: number
}) {
  const colors = getChartColors()
  if (!data?.length) return null

  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        data: data.map((d) => d.solde),
        borderColor: colors.primary,
        backgroundColor: colors.primary + "35",
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 1.5,
      },
    ],
  }
  const values = data.map((d) => d.solde)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.05 || 1
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { display: false },
      y: { display: false, min: min - padding, max: max + padding },
    },
  }
  return (
    <div style={{ height }} className="w-full">
      <Line data={chartData} options={options as object} />
    </div>
  )
}