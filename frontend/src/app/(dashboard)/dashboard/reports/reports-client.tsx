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
    const body: any =
      reportType === "mensuel"
        ? { type: "mensuel", emailDestinataire: shareEmail, mois, annee }
        : { type: "financier", emailDestinataire: shareEmail, dateDebut: dateDebut || new Date(annee, mois - 1, 1).toISOString().slice(0, 10), dateFin: dateFin || new Date(annee, mois, 0).toISOString().slice(0, 10) }
    const res = await api.post("/api/rapports/partager-email", body)
    if (res.succes) {
      toast.success("Rapport envoyé par email")
      setShareOpen(false)
    } else toast.error(res.message ?? "Erreur")
  }

  function renderContent() {
    if (loading) return <Skeleton className="h-[200px] w-full rounded-lg" />
    if (!data) return <div className="text-muted-foreground text-sm">Aucune donnée</div>
    if (reportType === "mensuel" && "resume" in data) {
      const d = data as MensuelData
      return (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <p><span className="text-muted-foreground">Revenus</span> {d.resume.revenus.toFixed(0)} MAD</p>
            <p><span className="text-muted-foreground">Dépenses</span> {d.resume.depenses.toFixed(0)} MAD</p>
            <p><span className="text-muted-foreground">Épargne</span> {d.resume.epargne.toFixed(0)} MAD</p>
            <p><span className="text-muted-foreground">Taux d'épargne</span> {d.resume.tauxEpargne.toFixed(1)} %</p>
          </div>
          {d.repartitionDepenses?.length ? (
            <ul className="space-y-1 text-sm">
              {d.repartitionDepenses.slice(0, 8).map((r) => (
                <li key={r.categorie} className="flex justify-between">
                  <span>{r.categorie}</span>
                  <span className="tabular-nums">{r.montant.toFixed(0)} MAD ({r.pourcentage.toFixed(1)} %)</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )
    }
    if (reportType === "depenses" && "totalDepenses" in data) {
      const d = data as DepensesData
      return (
        <div className="space-y-4">
          <p><strong>Total dépenses</strong> {d.totalDepenses.toFixed(0)} MAD</p>
          <p className="text-muted-foreground text-sm">Évolution vs période précédente: {d.evolution?.toFixed(0) ?? 0} MAD</p>
          {d.repartitionParCategorie?.length ? (
            <ul className="space-y-1 text-sm">
              {d.repartitionParCategorie.map((r: any) => (
                <li key={r.categorie} className="flex justify-between">
                  <span>{r.categorie}</span>
                  <span className="tabular-nums">{r.montant.toFixed(0)} MAD</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )
    }
    if (reportType === "revenus" && "totalRevenus" in data) {
      const d = data as RevenusData
      return (
        <div className="space-y-4">
          <p><strong>Total revenus</strong> {d.totalRevenus.toFixed(0)} MAD</p>
          {d.repartitionParSource?.length ? (
            <ul className="space-y-1 text-sm">
              {d.repartitionParSource.map((r) => (
                <li key={r.source} className="flex justify-between">
                  <span>{r.source}</span>
                  <span className="tabular-nums">{r.montant.toFixed(0)} MAD ({r.pourcentage.toFixed(1)} %)</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )
    }
    if (reportType === "epargne" && "montantEpargne" in data) {
      const d = data as EpargneData
      return (
        <div className="space-y-2">
          <p><strong>Montant épargné</strong> {d.montantEpargne.toFixed(0)} MAD</p>
          <p><strong>Taux d'épargne</strong> {d.tauxEpargne.toFixed(1)} %</p>
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
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reportType === "mensuel" ? (
              <>
                <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
                  <SelectTrigger className="w-[100px]"><SelectValue placeholder="Mois" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {new Date(2000, m - 1, 1).toLocaleString("fr-FR", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" className="w-[80px]" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} min={2020} max={2100} />
              </>
            ) : (
              <>
                <Input type="date" className="w-[140px]" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
                <Input type="date" className="w-[140px]" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleExportPdf}>Exporter PDF</Button>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>Partager par email</Button>
          </div>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Partager le rapport par email</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel>Email du destinataire</FieldLabel>
            <Input type="email" placeholder="email@exemple.com" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={handleShareEmail}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
