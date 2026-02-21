"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "Graphique d’évolution du solde"

const chartConfig = {
  solde: {
    label: "Solde",
    color: "var(--primary)",
  },
  desktop: {
    label: "Solde",
    color: "var(--primary)",
  },
  mobile: {
    label: "Solde",
    color: "var(--primary)",
  },
} satisfies ChartConfig

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
    if (isMobile) {
      setTimeRange("7d")
    }
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

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Évolution du solde</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Solde sur les 3 derniers mois
          </span>
          <span className="@[540px]/card:hidden">3 derniers mois</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
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
        {filteredApiData?.length ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={filteredApiData}>
              <defs>
                <linearGradient id="fillSolde" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-solde)"
                    stopOpacity={1}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-solde)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("fr-FR", {
                    month: "short",
                    day: "numeric",
                  })
                }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("fr-FR", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    formatter={(value) => [`${Number(value).toFixed(0)} MAD`, "Solde"]}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="solde"
                type="natural"
                fill="url(#fillSolde)"
                stroke="var(--color-solde)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="bg-muted/50 flex h-[250px] items-center justify-center rounded-lg text-muted-foreground text-sm">
            {isLoading ? "Chargement..." : "Aucune donnée d’évolution sur la période"}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
