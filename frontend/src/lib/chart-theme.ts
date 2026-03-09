"use client"

import type { ChartOptions } from "chart.js"

const FALLBACK = {
  primary: "oklch(0.55 0.27 277)",
  chart1: "oklch(0.55 0.27 277)",
  chart2: "oklch(0.6 0.118 184.704)",
  chart3: "oklch(0.398 0.07 227.392)",
  chart4: "oklch(0.828 0.189 84.429)",
  chart5: "oklch(0.769 0.188 70.08)",
  muted: "oklch(0.97 0 0)",
  mutedDark: "oklch(0.708 0 0)",
}

function getCssVar(name: string): string {
  if (typeof document === "undefined") return ""
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || ""
}

export function getChartColors() {
  const border = getCssVar("--border") || "oklch(0.922 0 0)"
  return {
    primary: getCssVar("--primary") || FALLBACK.primary,
    chart1: getCssVar("--chart-1") || FALLBACK.chart1,
    chart2: getCssVar("--chart-2") || FALLBACK.chart2,
    chart3: getCssVar("--chart-3") || FALLBACK.chart3,
    chart4: getCssVar("--chart-4") || FALLBACK.chart4,
    chart5: getCssVar("--chart-5") || FALLBACK.chart5,
    muted: getCssVar("--muted") || FALLBACK.muted,
    mutedFg: getCssVar("--muted-foreground") || FALLBACK.mutedDark,
    border,
    /** Very light gray for grid/axis lines so they don't dominate */
    gridLine: "rgba(0, 0, 0, 0.07)",
    background: getCssVar("--background") || "oklch(1 0 0)",
  }
}

const CHART_COLORS = ["chart1", "chart2", "chart3", "chart4", "chart5"] as const

export function getChartPalette(): string[] {
  const c = getChartColors()
  return CHART_COLORS.map((k) => c[k])
}

/** Pro default options for all charts: grid, font, tooltip, legend */
export function getChartDefaults(): Partial<ChartOptions<"line" | "bar" | "doughnut" | "pie">> {
  const colors = getChartColors()
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 16,
          font: { size: 12, family: "var(--font-sans), system-ui, sans-serif" },
          color: colors.mutedFg,
        },
      },
      tooltip: {
        backgroundColor: colors.background,
        titleColor: colors.mutedFg,
        bodyColor: colors.mutedFg,
        borderColor: colors.border,
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 12 },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label(ctx) {
            const v = ctx.parsed?.y ?? ctx.parsed
            if (typeof v === "number") return `${v.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`
            return String(v)
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          font: { size: 11, family: "var(--font-sans), system-ui, sans-serif" },
          color: colors.gridLine,
          maxRotation: 0,
        },
      },
      y: {
        grid: { color: colors.gridLine, lineWidth: 1 },
        border: { display: false },
        ticks: {
          font: { size: 11, family: "var(--font-sans), system-ui, sans-serif" },
          color: colors.gridLine,
          callback(value) {
            return typeof value === "number" ? value.toLocaleString("fr-MA") : value
          },
        },
      },
    },
  }
}