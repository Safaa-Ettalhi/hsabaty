import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import data from "./data.json"

export default function DashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <SectionCards />
        <div className="px-4 lg:px-6 space-y-6">
          <ChartAreaInteractive />
          <Card>
            <CardHeader>
              <CardTitle>Répartition des dépenses</CardTitle>
              <CardDescription>Par catégorie (camembert) — à venir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 flex h-[240px] items-center justify-center rounded-lg text-muted-foreground">
                Graphique à venir
              </div>
            </CardContent>
          </Card>
        </div>
        <DataTable data={data} />
      </div>
    </div>
  )
}
