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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

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
  const [tendancesMensuelles, setTendancesMensuelles] = useState<Array<{ mois: string; label: string; revenus: number; depenses: number }>>([])
  const [dernieresTransactions, setDernieresTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periode, setPeriode] = useState("mois")

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
    api.get<{ tendances: Array<{ mois: string; label: string; revenus: number; depenses: number }> }>("/api/dashboard/tendances-mensuelles?nbMois=6").then((res) => {
      if (res.succes && res.donnees?.tendances) {
        setTendancesMensuelles(
          res.donnees.tendances.map((t) => ({
            ...t,
            label: new Date(t.mois + "-01").toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
          }))
        )
      }
    })
  }, [])

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

  const periodeOptions = [
    { value: "mois", label: "Ce mois" },
    { value: "trimestre", label: "3 mois" },
    { value: "semestre", label: "6 mois" },
    { value: "annee", label: "Année" },
  ]
  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#8884d8", "#82ca9d", "#ffc658"]

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
          <h2 className="text-xl font-semibold tracking-tight">Tableau de bord</h2>
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              {periodeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Tendances mensuelles</CardTitle>
              <CardDescription>Revenus et dépenses par mois (6 derniers mois)</CardDescription>
            </CardHeader>
            <CardContent>
              {tendancesMensuelles.length ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tendancesMensuelles} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                      <Tooltip formatter={(v: number) => [v.toFixed(0) + " MAD", ""]} labelFormatter={(_, payload) => payload?.[0]?.payload?.label} />
                      <Legend />
                      <Bar dataKey="revenus" name="Revenus" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="depenses" name="Dépenses" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-lg bg-muted/30 text-muted-foreground text-sm">
                  Chargement des tendances...
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Répartition des dépenses</CardTitle>
              <CardDescription>Par catégorie</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[240px] rounded-lg" />
              ) : dataApi?.repartitionDepenses?.length ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="h-[220px] w-full sm:w-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dataApi.repartitionDepenses.slice(0, 8).map((r, i) => ({ name: r.categorie, value: r.montant, fill: COLORS[i % COLORS.length] }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                        >
                          {dataApi.repartitionDepenses.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${v.toFixed(0)} MAD`, "Montant"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="flex-1 space-y-1 text-sm">
                    {dataApi.repartitionDepenses.slice(0, 8).map((r) => (
                      <li key={r.categorie} className="flex justify-between">
                        <span>{r.categorie}</span>
                        <span className="tabular-nums">{r.montant.toFixed(0)} MAD ({r.pourcentage.toFixed(1)} %)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-muted/50 flex h-[120px] items-center justify-center rounded-lg text-muted-foreground text-sm">
                  Aucune dépense sur la période
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Dernières transactions</CardTitle>
              <CardDescription>Vos transactions les plus récentes</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/transactions">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : dernieresTransactions.length ? (
              <div className="rounded-lg border">
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
              </div>
            ) : (
              <div className="flex h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 text-center text-muted-foreground text-sm">
                <p>Aucune transaction récente</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/transactions">Ajouter une transaction</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
