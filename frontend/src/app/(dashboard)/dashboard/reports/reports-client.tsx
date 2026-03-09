/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useEffect, useState } from "react"
import { api, downloadFile } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Download, Mail } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"

type MensuelData = {
  resume: { revenus: number; depenses: number; epargne: number; tauxEpargne: number }
  repartitionDepenses?: Array<{ categorie: string; montant: number; pourcentage: number }>
  topDepenses?: Array<{ description: string; montant: number }>
}

type DepensesData = {
  totalDepenses: number
  nombreTransactions: number
  depensesPrecedentes: number
  evolution: number
  repartitionParCategorie: Array<{ categorie: string; montant: number; pourcentage?: number }>
}

type RevenusData = {
  totalRevenus: number
  repartitionParSource: Array<{ source: string; montant: number; pourcentage: number }>
}

type EpargneData = {
  epargne: number
  tauxEpargne: number
  evolution?: number
}

const REPORT_TYPES = [
  { value: "mensuel", label: "Rapport mensuel" },
  { value: "depenses", label: "Rapport Dépenses" },
  { value: "revenus", label: "Rapport Revenus" },
  { value: "epargne", label: "Rapport Épargne" },
] as const

const chartCardClassName =
  "border border-border dark:border-white/10 bg-background shadow-none transition-transform duration-200 ease-out hover:-translate-y-0.5"

export function ReportsClient() {
  const [reportType, setReportType] = useState<string>("mensuel")
  const [mois, setMois] = useState(() => new Date().getMonth() + 1)
  const [annee, setAnnee] = useState(() => new Date().getFullYear())
  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")
  const [data, setData] = useState<MensuelData | DepensesData | RevenusData | EpargneData | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [sharing, setSharing] = useState(false)

  const formatter = new Intl.NumberFormat("fr-MA", { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });

  const periodParams =
    reportType === "mensuel"
      ? `mois=${mois}&annee=${annee}`
      : `dateDebut=${dateDebut || new Date(annee, mois - 1, 1).toISOString().slice(0, 10)}&dateFin=${dateFin || new Date(annee, mois, 0).toISOString().slice(0, 10)}`

  useEffect(() => {
    setLoading(true)
    const path =
      reportType === "mensuel"
        ? `/api/rapports/mensuel?mois=${mois}&annee=${annee}`
        : reportType === "depenses"
          ? `/api/rapports/depenses?${periodParams}`
          : reportType === "revenus"
            ? `/api/rapports/revenus?${periodParams}`
            : `/api/rapports/epargne?${periodParams}`
    api
      .get(path)
      .then((res) => {
        if (res.succes && res.donnees) setData(res.donnees as any)
      })
      .finally(() => setLoading(false))
  }, [reportType, mois, annee, dateDebut, dateFin])

  function handleExportPdf() {
    const q =
      reportType === "mensuel"
        ? `type=mensuel&mois=${mois}&annee=${annee}`
        : `type=financier&dateDebut=${dateDebut || new Date(annee, mois - 1, 1).toISOString().slice(0, 10)}&dateFin=${dateFin || new Date(annee, mois, 0).toISOString().slice(0, 10)}`
    downloadFile(`/api/rapports/export/pdf?${q}`, `rapport_${Date.now()}.pdf`).catch(() =>
      toast.error("Erreur export PDF")
    )
  }

  async function handleShareEmail() {
    const email = shareEmail.trim()
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Email invalide")
      return
    }
    setSharing(true)
    const body: any =
      reportType === "mensuel"
        ? { type: "mensuel", emailDestinataire: email, mois, annee }
        : {
            type: "financier",
            emailDestinataire: email,
            dateDebut: dateDebut || new Date(annee, mois - 1, 1).toISOString().slice(0, 10),
            dateFin: dateFin || new Date(annee, mois, 0).toISOString().slice(0, 10),
          }
    const res = await api.post("/api/rapports/partager-email", body)
    setSharing(false)
    if (res.succes) {
      toast.success("Rapport envoyé par email")
      setShareOpen(false)
    } else toast.error(res.message ?? "Erreur")
  }

  function renderContent() {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-100 w-full rounded-xl" />
        </div>
      )
    }
    if (!data) return <div className="text-muted-foreground text-sm flex items-center justify-center p-10 bg-muted/20 rounded-xl border border-dashed">Aucune donnée disponible pour cette période</div>

    if (reportType === "mensuel" && "resume" in data) {
      const d = data as MensuelData
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className={`${chartCardClassName} bg-linear-to-br from-green-50/50 to-green-100/20 dark:from-green-950/20 dark:to-transparent border-green-200/50 dark:border-green-900/50`}>
              <CardHeader className="pb-2">
                <CardDescription className="text-green-700/80 dark:text-green-400/80 font-medium">Revenus</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className="text-2xl font-bold tabular-nums text-green-700 dark:text-green-400">
                    +{formatter.format(d.resume.revenus)}
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>

            <Card className={`${chartCardClassName} bg-linear-to-br from-red-50/50 to-red-100/20 dark:from-red-950/20 dark:to-transparent border-red-200/50 dark:border-red-900/50`}>
              <CardHeader className="pb-2">
                <CardDescription className="text-red-700/80 dark:text-red-400/80 font-medium">Dépenses</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className="text-2xl font-bold tabular-nums text-red-700 dark:text-red-400">
                    -{formatter.format(d.resume.depenses)}
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>

            <Card className={`${chartCardClassName} bg-linear-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-transparent border-primary/20`}>
              <CardHeader className="pb-2">
                <CardDescription className="text-primary/80 font-medium">Épargne brute</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className="text-2xl font-bold tabular-nums text-primary">
                    {formatter.format(d.resume.epargne)}
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>

            <Card className={`${chartCardClassName} bg-linear-to-br from-blue-50/50 to-blue-100/20 dark:from-blue-950/20 dark:to-transparent border-blue-200/50 dark:border-blue-900/50`}>
              <CardHeader className="pb-2">
                <CardDescription className="text-blue-700/80 dark:text-blue-400/80 font-medium">Taux d&apos;épargne</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-400">
                    {d.resume.tauxEpargne.toFixed(1)}%
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>
          </div>

          {d.repartitionDepenses?.length ? (
            <Card className={chartCardClassName}>
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-base text-destructive">Top Dépenses du mois</CardTitle>
                <CardDescription>
                  Où votre argent est-il allé ? (Top 8 catégories)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {d.repartitionDepenses.slice(0, 8).map((r, i) => (
                    <div key={r.categorie} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center font-bold text-xs">
                          {i + 1}
                        </div>
                        <span className="font-medium">{r.categorie}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatter.format(r.montant)}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium bg-red-100 dark:bg-red-900/20 dark:text-red-400 px-2 py-0.5 rounded-full mt-1">
                          {r.pourcentage.toFixed(1)} %
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )
    }

    if (reportType === "depenses" && "totalDepenses" in data) {
      const d = data as DepensesData
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className={`${chartCardClassName} bg-linear-to-br from-red-50/50 to-red-100/20 dark:from-red-950/20 dark:to-transparent border-red-200/50 dark:border-red-900/50`}>
              <CardHeader className="pb-2">
                <CardDescription className="text-red-700/80 dark:text-red-400/80 font-medium">Total dépenses</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className="text-3xl font-bold tabular-nums text-red-700 dark:text-red-400">
                    -{formatter.format(d.totalDepenses)}
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>

            <Card className={chartCardClassName}>
              <CardHeader className="pb-2">
                <CardDescription>Transactions</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className="text-3xl font-bold tabular-nums">
                    {d.nombreTransactions}
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>

            <Card className={chartCardClassName}>
              <CardHeader className="pb-2">
                <CardDescription>Évolution vs période préc.</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className={`text-3xl font-bold tabular-nums ${(d.evolution || 0) > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                    {(d.evolution || 0) > 0 ? "+" : ""}{d.evolution?.toFixed(0) ?? 0} MAD
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>
          </div>

          {d.repartitionParCategorie?.length ? (
            <Card className={chartCardClassName}>
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-base text-destructive">Catégories de Dépenses</CardTitle>
                <CardDescription>Répartition complète sur la période ciblée</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {d.repartitionParCategorie.sort((a,b) => b.montant - a.montant).map((r: any) => (
                    <div key={r.categorie} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-red-400"></div>
                        <span className="font-medium">{r.categorie}</span>
                      </div>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatter.format(r.montant)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )
    }

    if (reportType === "revenus" && "totalRevenus" in data) {
      const d = data as RevenusData
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className={`${chartCardClassName} bg-linear-to-br from-green-50/50 to-green-100/20 dark:from-green-950/20 dark:to-transparent border-green-200/50 dark:border-green-900/50`}>
              <CardHeader className="pb-2">
                <CardDescription className="text-green-700/80 dark:text-green-400/80 font-medium">Total revenus</CardDescription>
                <div className="flex items-baseline justify-between gap-2">
                  <CardTitle className="text-3xl font-bold tabular-nums text-green-700 dark:text-green-400">
                    +{formatter.format(d.totalRevenus)}
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>
          </div>

          {d.repartitionParSource?.length ? (
            <Card className={chartCardClassName}>
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-base text-green-600 dark:text-green-400">Sources de Revenus</CardTitle>
                <CardDescription>La provenance de vos rentrées d&apos;argent</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {d.repartitionParSource.sort((a,b) => b.montant - a.montant).map((r) => (
                    <div key={r.source} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="font-medium">{r.source}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatter.format(r.montant)}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium bg-green-100 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded-full mt-1">
                          {r.pourcentage.toFixed(1)} %
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )
    }

    if (reportType === "epargne" && "epargne" in data) {
      const d = data as EpargneData
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className={`${chartCardClassName} bg-linear-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-transparent border-primary/20`}>
             <CardHeader className="pb-2">
               <CardDescription className="text-primary/80 font-medium">Montant épargné</CardDescription>
               <div className="flex items-baseline justify-between gap-2">
                 <CardTitle className="text-3xl font-bold tabular-nums text-primary">
                   {formatter.format(d.epargne)}
                 </CardTitle>
               </div>
             </CardHeader>
            </Card>

            <Card className={`${chartCardClassName} bg-linear-to-br from-blue-50/50 to-blue-100/20 dark:from-blue-950/20 dark:to-transparent border-blue-200/50 dark:border-blue-900/50`}>
             <CardHeader className="pb-2">
               <CardDescription className="text-blue-700/80 dark:text-blue-400/80 font-medium">Taux d&apos;épargne</CardDescription>
               <div className="flex items-baseline justify-between gap-2">
                 <CardTitle className="text-3xl font-bold tabular-nums text-blue-700 dark:text-blue-400">
                   {d.tauxEpargne.toFixed(1)} %
                 </CardTitle>
               </div>
             </CardHeader>
            </Card>

            {typeof d.evolution === "number" && (
              <Card className={chartCardClassName}>
                <CardHeader className="pb-2">
                  <CardDescription>Évolution vs période préc.</CardDescription>
                  <div className="flex items-baseline justify-between gap-2">
                    <CardTitle className={`text-3xl font-bold tabular-nums ${(d.evolution || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                     {(d.evolution || 0) >= 0 ? "+" : ""}{d.evolution.toFixed(0)} MAD
                    </CardTitle>
                  </div>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      )
    }
    return <div className="text-muted-foreground text-sm flex items-center justify-center p-10 bg-muted/20 rounded-xl border border-dashed">Erreur de format de données</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pb-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rapports</h2>
          <p className="text-muted-foreground text-sm mt-1">
             Génerez, analysez ou partagez vos performances financières historiques.
          </p>
        </div>
        
        {/* Barre de Filtres/Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-45 bg-background border-none shadow-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden sm:block w-px h-5 bg-border mx-1"></div>
            {reportType === "mensuel" ? (
              <>
                <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
                  <SelectTrigger className="w-32.5 bg-background border-none shadow-sm"><SelectValue placeholder="Mois" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {new Date(2000, m - 1, 1).toLocaleString("fr-FR", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="w-22.5 bg-background border-none shadow-sm"
                  value={annee}
                  onChange={(e) => setAnnee(Number(e.target.value))}
                  min={2020}
                  max={2100}
                />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-35 bg-background border-none shadow-sm"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                />
                <span className="text-muted-foreground text-xs font-medium">à</span>
                <Input
                  type="date"
                  className="w-35 bg-background border-none shadow-sm"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                />
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 shadow-sm" onClick={handleExportPdf}>
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </Button>
            <Button className="gap-2 shadow-sm" onClick={() => setShareOpen(true)}>
              <Mail className="w-4 h-4" />
              <span>Partager</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full">
        {renderContent()}
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <div className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="text-lg">Partager le rapport</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Le rapport sera généré et envoyé instantanément en format PDF.
              </p>
            </DialogHeader>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="font-semibold text-sm flex items-center gap-2">
                {REPORT_TYPES.find((t) => t.value === reportType)?.label ?? "Rapport"}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Période : {reportType === "mensuel"
                  ? new Date(annee, mois - 1, 1).toLocaleString("fr-FR", {
                      month: "long",
                      year: "numeric",
                    })
                  : `${new Date(
                      dateDebut || new Date(annee, mois - 1, 1).toISOString().slice(0, 10)
                    ).toLocaleDateString("fr-FR")} → ${new Date(
                      dateFin || new Date(annee, mois, 0).toISOString().slice(0, 10)
                    ).toLocaleDateString("fr-FR")}`}
              </p>
            </div>
            <Field>
              <FieldLabel className="text-sm font-medium mb-1.5">Email du destinataire</FieldLabel>
              <Input
                type="email"
                placeholder="expert-comptable@entreprise.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="h-10"
              />
            </Field>
            <DialogFooter className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShareOpen(false)}
                disabled={sharing}
              >
                Annuler
              </Button>
              <Button
                className="w-full sm:w-auto min-w-30"
                onClick={handleShareEmail}
                disabled={sharing || !shareEmail.trim()}
              >
                {sharing ? "Envoi en cours…" : "Envoyer"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
