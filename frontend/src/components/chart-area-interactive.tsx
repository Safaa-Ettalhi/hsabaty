/* eslint-disable react-hooks/purity */
"use client"

import * as React from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  LineController,
} from "chart.js"
import { Line } from "react-chartjs-2"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getChartColors, getChartDefaults } from "@/lib/chart-theme"

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  LineController
)

export const description = "Graphique d'évolution du solde"

export function ChartAreaInteractive({
  evolutionSolde,
  isLoading = false,
}: {
  evolutionSolde?: Array<{ date: string; solde: number }>
  isLoading?: boolean
} = {}) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d")
  }, [isMobile])

  const apiData = React.useMemo(() => {
    if (!evolutionSolde?.length) return null
    return evolutionSolde.map(({ date, solde }) => ({ date, solde }))
  }, [evolutionSolde])

  const filteredApiData =
    apiData && timeRange
      ? (() => {
          const ref = new Date(apiData[apiData.length - 1]?.date ?? Date.now())
          let days = 90
          if (timeRange === "30d") days = 30
          else if (timeRange === "7d") days = 7
          const start = new Date(ref)
          start.setDate(start.getDate() - days)
          return apiData.filter((d) => new Date(d.date) >= start)
        })()
      : apiData

  const colors = getChartColors()
  const defaults = getChartDefaults()

  const chartData = React.useMemo(() => {
    if (!filteredApiData?.length) return null
    return {
      labels: filteredApiData.map((d) =>
        new Date(d.date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })
      ),
      datasets: [
        {
          label: "Solde",
          data: filteredApiData.map((d) => d.solde),
          borderColor: colors.primary,
          backgroundColor: colors.primary + "25",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointBackgroundColor: colors.primary,
        },
      ],
    }
  }, [filteredApiData, colors.primary])

  const options = React.useMemo(
    () => ({
      ...defaults,
      plugins: {
        ...defaults.plugins,
        legend: { display: false },
        tooltip: {
          ...defaults.plugins?.tooltip,
          callbacks: {
            title: (items: { dataIndex?: number }[]) => {
              const idx = items[0]?.dataIndex
              const date = filteredApiData?.[idx ?? 0]?.date
              return date
                ? new Date(date).toLocaleDateString("fr-FR", { month: "short", day: "numeric" })
                : ""
            },
            label: (ctx: { parsed: { y?: number } }) => `${ctx.parsed.y?.toLocaleString("fr-MA", { maximumFractionDigits: 0 })} MAD`,
          },
        },
      },
    }),
    [defaults, filteredApiData]
  )

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Évolution du solde</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Solde sur les 3 derniers mois</span>
          <span className="@[540px]/card:hidden">3 derniers mois</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">3 mois</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 jours</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 jours</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Choisir une période"
            >
              <SelectValue placeholder="3 mois" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                3 mois
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                30 jours
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                7 jours
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {chartData ? (
          <div className="h-62.5 w-full">
            <Line data={chartData} options={options as object} />
          </div>
        ) : (
          <div className="bg-muted/50 flex h-62.5 items-center justify-center rounded-lg text-muted-foreground text-sm">
            {isLoading ? "Chargement..." : "Aucune donnée d'évolution sur la période"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}