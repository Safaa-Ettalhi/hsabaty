"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Controller } from "react-hook-form"
import { cn } from "@/lib/utils"

const periodeOptions = [
  { value: "mensuel", label: "Mensuel" },
  { value: "trimestriel", label: "Trimestriel" },
  { value: "annuel", label: "Annuel" },
] as const

const budgetFormSchema = z.object({
  nom: z.string().min(1, "Requis").max(100).trim(),
  montant: z.number().positive("Montant > 0").finite(),
  periode: z.enum(["mensuel", "trimestriel", "annuel"]),
  categorie: z.string().max(100).trim().optional(),
})

type BudgetFormValues = z.infer<typeof budgetFormSchema>

type Budget = {
  _id: string
  nom: string
  montant: number
  categorie?: string
  periode: string
  actif: boolean
  dateDebut?: string
  dateFin?: string
  statistiques?: { montantUtilise: number; montantRestant: number; pourcentageUtilise: number; statut: string }
}

function chargerBudgets(setBudgets: (b: Budget[]) => void, setLoading: (l: boolean) => void) {
  setLoading(true)
  api
    .get<{ budgets: Budget[] }>("/api/budgets")
    .then((res) => {
      if (res.succes && res.donnees?.budgets) setBudgets(res.donnees.budgets)
    })
    .finally(() => setLoading(false))
}

function ProgressBar({ statut, pourcentage }: { statut?: string; pourcentage: number }) {
  const pct = Math.min(100, Math.max(0, pourcentage))
  const variant =
    statut === "depasse"
      ? "bg-destructive"
      : statut === "attention"
        ? "bg-amber-500"
        : "bg-emerald-500"
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", variant)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function BudgetClient() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [toDelete, setToDelete] = useState<Budget | null>(null)
  const alertedRef = useRef(false)

  useEffect(() => {
    chargerBudgets(setBudgets, setLoading)
  }, [])

  useEffect(() => {
    if (loading) {
      alertedRef.current = false
      return
    }
    if (alertedRef.current || budgets.length === 0) return
    const depasse = budgets.filter((b) => b.statistiques?.statut === "depasse")
    const attention = budgets.filter((b) => b.statistiques?.statut === "attention")
    if (depasse.length > 0) {
      toast.error(`${depasse.length} budget(s) dépassé(s) : ${depasse.map((b) => b.nom).join(", ")}`)
      alertedRef.current = true
    } else if (attention.length > 0) {
      toast.warning(`${attention.length} budget(s) à 80 % ou plus : ${attention.map((b) => b.nom).join(", ")}`)
      alertedRef.current = true
    }
  }, [loading, budgets])

  const form = useForm<BudgetFormValues>({
    mode: "onBlur",
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      nom: "",
      montant: 0,
      periode: "mensuel",
      categorie: "",
    },
  })

  function openEdit(b: Budget) {
    setEditing(b)
    form.reset({
      nom: b.nom,
      montant: b.montant,
      periode: b.periode as BudgetFormValues["periode"],
      categorie: b.categorie ?? "",
    })
  }

  async function onSubmit(data: BudgetFormValues) {
    if (editing) {
      const res = await api.put<{ budget: Budget }>(`/api/budgets/${editing._id}`, {
        nom: data.nom,
        montant: data.montant,
        periode: data.periode,
        ...(data.categorie !== undefined ? { categorie: data.categorie || undefined } : {}),
      })
      if (res.succes) {
        toast.success("Budget modifié")
        setEditing(null)
        chargerBudgets(setBudgets, setLoading)
      } else toast.error(res.message ?? "Erreur")
    } else {
      const res = await api.post<{ budget: Budget }>("/api/budgets", {
        nom: data.nom,
        montant: data.montant,
        periode: data.periode,
        ...(data.categorie ? { categorie: data.categorie } : {}),
      })
      if (res.succes) {
        toast.success("Budget créé")
        form.reset({ nom: "", montant: 0, periode: "mensuel", categorie: "" })
        setOpen(false)
        chargerBudgets(setBudgets, setLoading)
      } else toast.error(res.message ?? "Erreur")
    }
  }

  async function handleDelete(b: Budget) {
    const res = await api.delete(`/api/budgets/${b._id}`)
    if (res.succes) {
      toast.success("Budget supprimé")
      setToDelete(null)
      chargerBudgets(setBudgets, setLoading)
    } else toast.error(res.message ?? "Erreur")
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">Budgets</CardTitle>
            <CardDescription>Création, suivi et alertes (80 % / dépassement)</CardDescription>
          </div>
          <Dialog open={open && !editing} onOpenChange={(o) => { setOpen(o); if (!o) form.reset({ nom: "", montant: 0, periode: "mensuel", categorie: "" }) }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={() => setEditing(null)}>
                <Plus className="size-4" />
                Créer un budget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm p-0 gap-0">
              <DialogHeader className="p-4 pb-2">
                <DialogTitle>Nouveau budget</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel className="text-xs">Nom</FieldLabel>
                    <Input placeholder="Ex. Alimentation" className="h-8 text-sm" {...form.register("nom")} />
                    <FieldError errors={[form.formState.errors.nom]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs">Période</FieldLabel>
                    <Controller
                      control={form.control}
                      name="periode"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {periodeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel className="text-xs">Montant (MAD)</FieldLabel>
                  <Input type="number" min={1} step={1} placeholder="5000" className="h-8 text-sm" {...form.register("montant", { valueAsNumber: true })} />
                  <FieldError errors={[form.formState.errors.montant]} />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Catégorie (opt.)</FieldLabel>
                  <Input placeholder="Ex. Courses, Transport" className="h-8 text-sm" {...form.register("categorie")} />
                </Field>
                <DialogFooter className="p-0 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" size="sm">Créer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogContent className="max-w-sm p-0 gap-0">
              <DialogHeader className="p-4 pb-2">
                <DialogTitle>Modifier le budget</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel className="text-xs">Nom</FieldLabel>
                    <Input className="h-8 text-sm" {...form.register("nom")} />
                    <FieldError errors={[form.formState.errors.nom]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs">Période</FieldLabel>
                    <Controller
                      control={form.control}
                      name="periode"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {periodeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel className="text-xs">Montant (MAD)</FieldLabel>
                  <Input type="number" min={1} step={1} className="h-8 text-sm" {...form.register("montant", { valueAsNumber: true })} />
                  <FieldError errors={[form.formState.errors.montant]} />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Catégorie (opt.)</FieldLabel>
                  <Input className="h-8 text-sm" {...form.register("categorie")} />
                </Field>
                <DialogFooter className="p-0 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)}>Annuler</Button>
                  <Button type="submit" size="sm">Enregistrer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Supprimer ce budget ?</DialogTitle>
              </DialogHeader>
              {toDelete && (
                <>
                  <p className="text-muted-foreground text-sm">{toDelete.nom} · {toDelete.montant} MAD ({toDelete.periode}). Le suivi des dépenses associées ne sera plus affiché ici.</p>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setToDelete(null)}>Annuler</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(toDelete)}>Supprimer</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-lg" />
          ) : budgets.length ? (
            <ul className="space-y-4">
              {budgets.map((b) => {
                const statut = b.statistiques?.statut ?? "ok"
                const pct = b.statistiques?.pourcentageUtilise ?? 0
                const restant = b.statistiques?.montantRestant ?? b.montant
                const utilise = b.statistiques?.montantUtilise ?? 0
                const dateFin = b.dateFin ? new Date(b.dateFin) : null
                const dateDebut = b.dateDebut ? new Date(b.dateDebut) : null
                const now = new Date()
                const joursTotal = dateDebut && dateFin ? Math.max(1, Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))) : 0
                const joursEcoules = dateDebut ? Math.max(0, Math.ceil((now.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))) : 0
                const previsionFin = joursEcoules > 0 && joursTotal > 0 && utilise > 0
                  ? (utilise / joursEcoules) * joursTotal
                  : null
                return (
                  <li
                    key={b._id}
                    className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{b.nom}</p>
                          <Badge
                            variant={statut === "depasse" ? "destructive" : statut === "attention" ? "secondary" : "outline"}
                            className="shrink-0 text-xs"
                          >
                            {statut === "depasse" ? "Dépassé" : statut === "attention" ? "Attention (80 %)" : "OK"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {b.categorie || "—"} · {b.periode}
                          {dateFin && (
                            <> · Fin {dateFin.toLocaleDateString("fr-FR")}</>
                          )}
                        </p>
                        <div className="mt-3">
                          <ProgressBar statut={statut} pourcentage={pct} />
                          <p className="mt-1.5 text-sm tabular-nums">
                            {utilise.toFixed(0)} / {b.montant} MAD
                            <span className="text-muted-foreground"> · Reste {restant.toFixed(0)} MAD</span>
                          </p>
                          {previsionFin != null && statut !== "depasse" && (
                            <p className="text-muted-foreground text-xs mt-0.5">
                              Prévision fin de période : ~{previsionFin.toFixed(0)} MAD
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(b)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/10 text-center text-muted-foreground text-sm">
              <p>Aucun budget.</p>
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Créer un budget</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
