"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Metriques = {
  solde: number
  revenus: number
  depenses: number
  revenusNets: number
  tauxEpargne: number
}

type DashboardReponse = {
  periode: { dateDebut: string; dateFin: string }
  metriques: Metriques
  repartitionDepenses: Array<{ categorie: string; montant: number; pourcentage: number }>
  topDepenses: Array<{ description: string; montant: number; categorie: string; date: string }>
  evolutionSolde: Array<{ date: string; solde: number }>
}

type Transaction = {
  _id: string
  date: string
  description: string
  categorie: string
  montant: number
  type: string
}

export function DashboardClient() {
  const [dataApi, setDataApi] = useState<DashboardReponse | null>(null)
  const [dernieresTransactions, setDernieresTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periode] = useState("mois")

  useEffect(() => {
    const params = new URLSearchParams({ periode })
    api
      .get<DashboardReponse>(`/api/dashboard/metriques?${params}`)
      .then((res) => {
        if (res.succes && res.donnees) setDataApi(res.donnees)
        else setError(res.message || "Erreur lors du chargement")
      })
      .catch(() => setError("Erreur de connexion au serveur"))
      .finally(() => setLoading(false))
  }, [periode])

  useEffect(() => {
    api
      .get<{ transactions: Transaction[] }>("/api/transactions?page=1&limite=5")
      .then((res) => {
        if (res.succes && res.donnees?.transactions) setDernieresTransactions(res.donnees.transactions)
      })
  }, [])

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <SectionCards
            metriques={dataApi?.metriques}
            devise={dataApi ? "MAD" : undefined}
          />
        )}
        <div className="px-4 space-y-6 lg:px-6">
          <ChartAreaInteractive evolutionSolde={dataApi?.evolutionSolde} isLoading={loading} />
          <Card>
            <CardHeader>
              <CardTitle>Répartition des dépenses</CardTitle>
              <CardDescription>Par catégorie</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[240px] rounded-lg" />
              ) : dataApi?.repartitionDepenses?.length ? (
                <ul className="space-y-2">
                  {dataApi.repartitionDepenses.slice(0, 8).map((r) => (
                    <li
                      key={r.categorie}
                      className="flex justify-between text-sm"
                    >
                      <span>{r.categorie}</span>
                      <span className="tabular-nums">
                        {r.montant.toFixed(0)} MAD ({r.pourcentage.toFixed(1)}
                        %)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bg-muted/50 flex h-[120px] items-center justify-center rounded-lg text-muted-foreground text-sm">
                  Aucune dépense sur la période
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Dernières transactions</CardTitle>
              <CardDescription>Vos transactions les plus récentes</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/transactions">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : dernieresTransactions.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dernieresTransactions.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(t.date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell>{t.categorie}</TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${t.type === "depense" ? "text-destructive" : "text-green-600 dark:text-green-400"}`}
                      >
                        {t.type === "depense" ? "-" : "+"}
                        {t.montant.toFixed(2)} MAD
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="bg-muted/50 flex h-[120px] items-center justify-center rounded-lg text-muted-foreground text-sm">
                Aucune transaction récente
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
