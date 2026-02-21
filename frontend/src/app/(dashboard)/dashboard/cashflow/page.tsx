import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Flux de trésorerie - Hssabaty",
  description: "Visualisation des flux de trésorerie",
}

export default function CashflowPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Flux de trésorerie</CardTitle>
          <CardDescription>Visualisation Sankey — à venir</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 flex h-[200px] items-center justify-center rounded-lg text-muted-foreground">
            Contenu à venir
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
