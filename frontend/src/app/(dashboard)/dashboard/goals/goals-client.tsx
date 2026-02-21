"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

type Objectif = {
  _id: string
  nom: string
  montantCible: number
  montantActuel: number
  dateLimite: string
  type: string
  actif: boolean
  progression?: { montantRestant: number; pourcentageComplete: number; montantMensuelRequis: number }
}

export function GoalsClient() {
  const [objectifs, setObjectifs] = useState<Objectif[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<{ objectifs: Objectif[] }>("/api/objectifs")
      .then((res) => {
        if (res.succes && res.donnees?.objectifs) setObjectifs(res.donnees.objectifs)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Objectifs</CardTitle>
          <CardDescription>Objectifs d’épargne et suivi de progression</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : objectifs.length ? (
            <ul className="space-y-4">
              {objectifs.map((o) => (
                <li
                  key={o._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{o.nom}</p>
                    <p className="text-muted-foreground text-sm">
                      {o.type} · limite {new Date(o.dateLimite).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">
                      {o.montantActuel} / {o.montantCible} MAD
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Reste: {o.progression?.montantRestant?.toFixed(0) ?? (o.montantCible - o.montantActuel)} MAD
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {o.progression?.pourcentageComplete?.toFixed(1) ?? 0} %
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-muted/50 flex h-[200px] items-center justify-center rounded-lg text-muted-foreground text-sm">
              Aucun objectif. Créez-en un via le chat ou l’API.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
