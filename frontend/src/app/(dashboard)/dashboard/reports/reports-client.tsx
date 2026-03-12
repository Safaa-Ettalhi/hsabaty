/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useEffect, useState } from "react"
import { api, downloadFile } from "@/lib/api"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Download, Mail, FileText, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown, Clock, SearchCode } from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"
import { FluxCardEntrees, FluxCardSorties, FluxCardSolde } from "@/components/flux-kpi-cards"

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
  { value: "mensuel", label: "Synthèse Mensuelle" },
  { value: "depenses", label: "Analyse Dépenses" },
  { value: "revenus", label: "Analyse Revenus" },
  { value: "epargne", label: "Analyse Épargne" },
] as const

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
        <div className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-35 w-full rounded-2xl" />)}
          </div>
          <Skeleton className="h-100 w-full rounded-3xl" />
        </div>
      )
    }

    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center p-16 text-center h-100 mt-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl">
          <div className="size-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5 border border-zinc-200 dark:border-zinc-700">
             <SearchCode className="size-8 text-zinc-400" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Aucune donnée disponible</h3>
          <p className="text-zinc-500 max-w-sm mx-auto text-sm leading-relaxed">
            Il n&apos;y a eu aucun mouvement détecté sur cette période pour générer ce rapport ciblé.
          </p>
        </div>
      )
    }

    if (reportType === "mensuel" && "resume" in data) {
      const d = data as MensuelData
      return (
        <div className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FluxCardEntrees
              title="Revenus"
              value={<span>+{formatter.format(d.resume.revenus)}</span>}
              icon={ArrowUpCircle}
            />
            <FluxCardSorties
              title="Dépenses"
              value={<span>−{formatter.format(d.resume.depenses)}</span>}
              icon={ArrowDownCircle}
            />
            <FluxCardSolde
              title="Épargne brute"
              value={<span>{d.resume.epargne > 0 ? "+" : ""}{formatter.format(d.resume.epargne)}</span>}
              subtitle="Reste après dépenses"
              icon={Wallet}
              positive={d.resume.epargne >= 0}
            />
            <div className="flex flex-col justify-center rounded-3xl border border-violet-500/15 bg-linear-to-br from-white to-violet-50/50 p-6 shadow-sm dark:border-violet-500/10 dark:from-zinc-900 dark:to-violet-950/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600/90 dark:text-violet-400/90">
                Taux d&apos;épargne
              </p>
              <h3 className="mt-2 text-3xl font-bold tabular-nums text-violet-800 dark:text-violet-300">
                {d.resume.tauxEpargne.toFixed(1)}%
              </h3>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Part des revenus conservée
              </p>
            </div>
          </div>

          {d.repartitionDepenses?.length ? (
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm overflow-hidden">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">Top Dépenses du mois</h3>
                <p className="text-sm text-zinc-500">Où est passé votre argent ? (Aperçu des catégories les plus lourdes)</p>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {d.repartitionDepenses.slice(0, 8).map((r, i) => (
                  <div key={r.categorie} className="flex items-center justify-between py-4 group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 px-4 -mx-4 transition-colors rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs ring-1 ring-rose-100 dark:ring-rose-500/20">
                        {i + 1}
                      </div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{r.categorie}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold tabular-nums text-foreground">
                        {formatter.format(r.montant)}
                      </span>
                      <span className="text-xs text-rose-600 font-medium bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full mt-1 border border-rose-100 dark:border-rose-800/50">
                        {r.pourcentage.toFixed(1)} %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )
    }

    if (reportType === "depenses" && "totalDepenses" in data) {
      const d = data as DepensesData
      return (
        <div className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm">
              <p className="text-sm font-semibold text-rose-700/80 dark:text-rose-400/80 mb-1">Total dépenses</p>
              <h3 className="text-3xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">-{formatter.format(d.totalDepenses)}</h3>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-center">
              <p className="text-sm font-semibold text-zinc-500 mb-1">Transactions Effectuées</p>
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{d.nombreTransactions}</h3>
            </div>

            <div
              className={cn(
                "relative overflow-hidden rounded-3xl border p-6 shadow-sm",
                (d.evolution || 0) <= 0
                  ? "border-emerald-500/20 bg-linear-to-br from-emerald-600 to-emerald-800 text-white"
                  : "border-rose-500/20 bg-linear-to-br from-rose-600 to-rose-800 text-white"
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                Évolution vs période préc.
              </p>
              <h3 className="mt-2 text-3xl font-bold tabular-nums">
                {(d.evolution || 0) > 0 ? "+" : ""}
                {d.evolution?.toFixed(0) ?? 0} MAD
              </h3>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30">
                {(d.evolution || 0) > 0 ? <TrendingUp className="size-14" /> : <TrendingDown className="size-14" />}
              </div>
            </div>
          </div>

          {d.repartitionParCategorie?.length ? (
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm overflow-hidden">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">Poids Catégoriel</h3>
                <p className="text-sm text-zinc-500">Répartition complète de la période ciblée</p>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {d.repartitionParCategorie.sort((a,b) => b.montant - a.montant).map((r: any) => (
                  <div key={r.categorie} className="flex items-center justify-between py-3 group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 px-4 -mx-4 transition-colors rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-200 text-sm">{r.categorie}</span>
                    </div>
                    <span className="font-bold tabular-nums text-foreground">
                      {formatter.format(r.montant)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )
    }

    if (reportType === "revenus" && "totalRevenus" in data) {
      const d = data as RevenusData
      return (
        <div className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm">
              <p className="text-sm font-semibold text-emerald-700/80 dark:text-emerald-400/80 mb-1">Total Encaissé</p>
              <h3 className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">+{formatter.format(d.totalRevenus)}</h3>
            </div>
          </div>

          {d.repartitionParSource?.length ? (
            <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm overflow-hidden">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Sources de Revenus</h3>
                <p className="text-sm text-zinc-500">La provenance de vos rentrées d&apos;argent</p>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {d.repartitionParSource.sort((a,b) => b.montant - a.montant).map((r) => (
                  <div key={r.source} className="flex items-center justify-between py-4 group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 px-4 -mx-4 transition-colors rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-200 text-sm">{r.source}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold tabular-nums text-foreground">
                        {formatter.format(r.montant)}
                      </span>
                      <span className="text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full mt-1 border border-emerald-100 dark:border-emerald-800/50">
                        {r.pourcentage.toFixed(1)} %
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )
    }

    if (reportType === "epargne" && "epargne" in data) {
      const d = data as EpargneData
      return (
        <div className="space-y-6 mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FluxCardSolde
              title="Montant épargné"
              value={formatter.format(d.epargne)}
              icon={Wallet}
              positive={d.epargne >= 0}
            />

            <div className="relative overflow-hidden rounded-3xl border border-violet-500/15 bg-linear-to-br from-white to-violet-50/50 p-6 shadow-sm dark:border-violet-500/10 dark:from-zinc-900 dark:to-violet-950/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600/90 dark:text-violet-400/90">
                Taux fixé
              </p>
              <h3 className="mt-2 text-3xl font-bold tabular-nums text-violet-800 dark:text-violet-300">
                {d.tauxEpargne.toFixed(1)} %
              </h3>
            </div>

            {typeof d.evolution === "number" && (
              <div className="relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-linear-to-br from-white to-emerald-50/50 p-6 shadow-sm dark:border-emerald-500/10 dark:from-zinc-900 dark:to-emerald-950/20">
                <p className="text-sm font-semibold text-zinc-500 mb-1">Évolution vs période préc.</p>
                <h3 className={cn("text-3xl font-bold tabular-nums", (d.evolution || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {(d.evolution || 0) >= 0 ? "+" : ""}{d.evolution.toFixed(0)} MAD
                </h3>
              </div>
            )}
          </div>
        </div>
      )
    }
    return <div className="text-muted-foreground text-sm flex items-center justify-center p-10 bg-muted/20 rounded-xl border border-dashed">Erreur de format de données</div>
  }

  return (
    <DashboardPageShell contentClassName="gap-6">
      <DashboardPageHeader
        badge={{ icon: FileText, label: "Rapports" }}
        title="Rapports financiers"
        description="Générez, analysez ou partagez vos performances en PDF ou par email."
        actions={
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:w-auto">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-45 bg-transparent border-none shadow-none font-medium h-9 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800"></div>
            {reportType === "mensuel" ? (
              <div className="flex items-center gap-1 pr-1">
                <Clock className="w-4 h-4 text-zinc-400 ml-1" />
                <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
                  <SelectTrigger className="w-32 bg-transparent border-none shadow-none text-sm h-9 focus:ring-0"><SelectValue placeholder="Mois" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {new Date(2000, m - 1, 1).toLocaleString("fr-FR", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="w-20 bg-transparent border-none shadow-none text-sm h-9 px-2 focus-visible:ring-0"
                  value={annee}
                  onChange={(e) => setAnnee(Number(e.target.value))}
                  min={2020}
                  max={2100}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 pr-2">
                <Input
                  type="date"
                  className="w-32 bg-transparent border-none shadow-none text-xs h-9 focus-visible:ring-0 px-2"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                />
                <span className="text-zinc-300 dark:text-zinc-700">-</span>
                <Input
                  type="date"
                  className="w-32 bg-transparent border-none shadow-none text-xs h-9 focus-visible:ring-0 px-2"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                />
              </div>
            )}
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="gap-2 shadow-sm rounded-xl h-12 flex-1 sm:flex-none border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" onClick={handleExportPdf}>
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </Button>
            <Button className="gap-2 shadow-md hover:shadow-lg transition-shadow bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 flex-1 sm:flex-none" onClick={() => setShareOpen(true)}>
              <Mail className="w-4 h-4" />
              <span>Partager</span>
            </Button>
          </div>
        </div>
        }
      />

      <div className="w-full">
        {renderContent()}
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col gap-6">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
                  <FileText className="size-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Partager ce rapport</DialogTitle>
                </div>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed text-left">
                Ce rapport sera instantanément généré sous un magnifique format PDF et envoyé sur l&apos;adresse email de votre choix. Idéal pour un expert-comptable.
              </p>
            </DialogHeader>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
              <p className="font-semibold text-sm flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                {REPORT_TYPES.find((t) => t.value === reportType)?.label ?? "Rapport"}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Période couverte : {reportType === "mensuel"
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
              <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Email destinataire</FieldLabel>
              <Input
                type="email"
                placeholder="expert-comptable@entreprise.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="h-12 rounded-xl text-base px-4"
              />
            </Field>
            <DialogFooter className="mt-2 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto h-12 rounded-xl font-medium"
                onClick={() => setShareOpen(false)}
                disabled={sharing}
              >
                Annuler
              </Button>
              <Button
                className="w-full sm:w-auto min-w-32 h-12 rounded-xl bg-violet-600 hover:bg-violet-700 font-semibold shadow-md"
                onClick={handleShareEmail}
                disabled={sharing || !shareEmail.trim()}
              >
                {sharing ? "Envoi sécurisé..." : "Envoyer le PDF"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardPageShell>
  )
}
