/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useEffect, useState } from "react"
import { api, downloadFile } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
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
  montantEpargne: number
  tauxEpargne: number
  evolution?: number
}

const REPORT_TYPES = [
  { value: "mensuel", label: "Rapport mensuel" },
  { value: "depenses", label: "Dépenses" },
  { value: "revenus", label: "Revenus" },
  { value: "epargne", label: "Épargne" },
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
    if (loading) return <Skeleton className="h-65 w-full rounded-lg" />
    if (!data) return <div className="text-muted-foreground text-sm">Aucune donnée</div>
    if (reportType === "mensuel" && "resume" in data) {
      const d = data as MensuelData
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Revenus</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {d.resume.revenus.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">MAD</span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Dépenses</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {d.resume.depenses.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">MAD</span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Épargne</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {d.resume.epargne.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">MAD</span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Taux d&apos;épargne</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{d.resume.tauxEpargne.toFixed(1)} %</p>
            </div>
          </div>
          {d.repartitionDepenses?.length ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted/60 px-4 py-2 text-xs font-medium text-muted-foreground">
                Répartition des dépenses (top 8)
              </div>
              <div className="divide-y text-sm">
                {d.repartitionDepenses.slice(0, 8).map((r) => (
                  <div key={r.categorie} className="flex items-center justify-between px-4 py-2">
                    <span>{r.categorie}</span>
                    <span className="tabular-nums text-right text-muted-foreground">
                      {r.montant.toFixed(0)} MAD · {r.pourcentage.toFixed(1)} %
                    </span>
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
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Total dépenses</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {d.totalDepenses.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">MAD</span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Transactions</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{d.nombreTransactions}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Évolution vs période préc.</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {d.evolution?.toFixed(0) ?? 0} <span className="text-sm font-normal text-muted-foreground">MAD</span>
              </p>
            </div>
          </div>
          {d.repartitionParCategorie?.length ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted/60 px-4 py-2 text-xs font-medium text-muted-foreground">
                Dépenses par catégorie
              </div>
              <div className="divide-y text-sm">
                {d.repartitionParCategorie.map((r: any) => (
                  <div key={r.categorie} className="flex items-center justify-between px-4 py-2">
                    <span>{r.categorie}</span>
                    <span className="tabular-nums text-muted-foreground">{r.montant.toFixed(0)} MAD</span>
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
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Total revenus</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {d.totalRevenus.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">MAD</span>
              </p>
            </div>
          </div>
          {d.repartitionParSource?.length ? (
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted/60 px-4 py-2 text-xs font-medium text-muted-foreground">
                Revenus par source
              </div>
              <div className="divide-y text-sm">
                {d.repartitionParSource.map((r) => (
                  <div key={r.source} className="flex items-center justify-between px-4 py-2">
                    <span>{r.source}</span>
                    <span className="tabular-nums text-right text-muted-foreground">
                      {r.montant.toFixed(0)} MAD · {r.pourcentage.toFixed(1)} %
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )
    }
    if (reportType === "epargne" && "montantEpargne" in data) {
      const d = data as EpargneData
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Montant épargné</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {d.montantEpargne.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">MAD</span>
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Taux d&apos;épargne</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{d.tauxEpargne.toFixed(1)} %</p>
            </div>
            {typeof d.evolution === "number" && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Évolution vs période préc.</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {d.evolution.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">MAD</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }
    return <div className="text-muted-foreground text-sm">Aucune donnée</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Rapports</CardTitle>
            <CardDescription>Choisissez le type de rapport et la période</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-45"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reportType === "mensuel" ? (
              <>
                <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
                  <SelectTrigger className="w-32.5"><SelectValue placeholder="Mois" /></SelectTrigger>
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
                  className="w-22.5"
                  value={annee}
                  onChange={(e) => setAnnee(Number(e.target.value))}
                  min={2020}
                  max={2100}
                />
              </>
            ) : (
              <>
                <Input
                  type="date"
                  className="w-37.5"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                />
                <Input
                  type="date"
                  className="w-37.5"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                />
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleExportPdf}>Exporter PDF</Button>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>Partager par email</Button>
          </div>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-105 p-5">
          <div className="flex flex-col gap-4">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-base">Partager le rapport par email</DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Envoyez ce rapport à un collaborateur ou à vous-même.
              </p>
            </DialogHeader>
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <p className="font-medium">
                {REPORT_TYPES.find((t) => t.value === reportType)?.label ?? "Rapport"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {reportType === "mensuel"
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
              <FieldLabel className="text-xs">Email du destinataire</FieldLabel>
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </Field>
            <DialogFooter className="mt-1 flex flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShareOpen(false)}
                disabled={sharing}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                className="flex-1"
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
