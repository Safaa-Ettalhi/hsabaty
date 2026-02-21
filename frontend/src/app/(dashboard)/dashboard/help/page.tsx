import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Aide - Hssabaty",
  description: "Aide et support",
}

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Aide</CardTitle>
          <CardDescription>Centre d&apos;aide et support — à venir</CardDescription>
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
