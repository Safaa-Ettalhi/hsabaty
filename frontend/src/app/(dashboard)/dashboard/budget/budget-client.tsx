"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Wallet, Target, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react"
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

const formatter = new Intl.NumberFormat("fr-MA", { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });

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
  
  let gradientClass = "bg-linear-to-r from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-600"
  let bgClass = "bg-emerald-100 dark:bg-emerald-950/40"
  let shadowClass = "shadow-[0_0_10px_rgba(16,185,129,0.3)]"
  
  if (statut === "depasse") {
    gradientClass = "bg-linear-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700"
    bgClass = "bg-red-100 dark:bg-red-950/40"
    shadowClass = "shadow-[0_0_10px_rgba(239,68,68,0.3)]"
  } else if (statut === "attention") {
    gradientClass = "bg-linear-to-r from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600"
    bgClass = "bg-amber-100 dark:bg-amber-950/40"
    shadowClass = "shadow-[0_0_10px_rgba(245,158,11,0.3)]"
  }

  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full", bgClass)}>
      <div
        className={cn("h-full rounded-full transition-all duration-1000 ease-out", gradientClass, pct > 10 && shadowClass)}
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

  const globalMontantTotal = budgets.reduce((sum, b) => sum + b.montant, 0)
  const globalUtilise = budgets.reduce((sum, b) => sum + (b.statistiques?.montantUtilise || 0), 0)
  const globalRestant = Math.max(0, globalMontantTotal - globalUtilise)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Budgets</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez vos enveloppes de dépenses de manière claire et précise.
          </p>
        </div>
        <Dialog open={open && !editing} onOpenChange={(o) => { setOpen(o); if (!o) form.reset({ nom: "", montant: 0, periode: "mensuel", categorie: "" }) }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm rounded-full px-6" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              Nouveau budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-lg">Créer une enveloppe</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Définissez une limite de dépenses pour une période donnée.
              </p>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel className="text-sm font-medium mb-1.5">Nom</FieldLabel>
                  <Input placeholder="Ex. Courses" className="h-10" {...form.register("nom")} />
                  <FieldError errors={[form.formState.errors.nom]} />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-medium mb-1.5">Période</FieldLabel>
                  <Controller
                    control={form.control}
                    name="periode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
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
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel className="text-sm font-medium mb-1.5">Limite (MAD)</FieldLabel>
                  <Input type="number" min={1} step={1} placeholder="5000" className="h-10" {...form.register("montant", { valueAsNumber: true })} />
                  <FieldError errors={[form.formState.errors.montant]} />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-medium mb-1.5">Catégorie</FieldLabel>
                  <Input placeholder="Ex. Alimentation" className="h-10" {...form.register("categorie")} />
                </Field>
              </div>
              <DialogFooter className="pt-4 flex gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" className="w-full sm:w-auto">Créer le budget</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-lg">Modifier le budget</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajustez les paramètres de votre enveloppe existante.
            </p>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel className="text-sm font-medium mb-1.5">Nom</FieldLabel>
                <Input className="h-10" {...form.register("nom")} />
                <FieldError errors={[form.formState.errors.nom]} />
              </Field>
              <Field>
                <FieldLabel className="text-sm font-medium mb-1.5">Période</FieldLabel>
                <Controller
                  control={form.control}
                  name="periode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
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
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel className="text-sm font-medium mb-1.5">Limite (MAD)</FieldLabel>
                <Input type="number" min={1} step={1} className="h-10" {...form.register("montant", { valueAsNumber: true })} />
                <FieldError errors={[form.formState.errors.montant]} />
              </Field>
              <Field>
                <FieldLabel className="text-sm font-medium mb-1.5">Catégorie</FieldLabel>
                <Input className="h-10" {...form.register("categorie")} />
              </Field>
            </div>
            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="submit" className="w-full sm:w-auto">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md p-6">
          {toDelete && (
             <div className="flex flex-col gap-5">
               <DialogHeader>
                 <DialogTitle className="text-lg flex items-center gap-2 text-destructive">
                   <AlertCircle className="h-5 w-5" />
                   Suppression de budget
                 </DialogTitle>
                 <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                   Vous êtes sur le point de supprimer ce budget. Son suivi sera effacé mais <strong>vos transactions resteront intactes</strong>.
                 </p>
               </DialogHeader>
               <div className="rounded-lg border bg-destructive/5 p-4 flex flex-col gap-1">
                 <p className="font-semibold text-foreground">{toDelete.nom}</p>
                 <p className="text-sm text-muted-foreground">
                   {formatter.format(toDelete.montant)} · {toDelete.periode}
                   {toDelete.categorie ? <> · {toDelete.categorie}</> : null}
                 </p>
               </div>
               <DialogFooter className="mt-2 flex gap-2">
                 <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setToDelete(null)}>
                   Annuler
                 </Button>
                 <Button type="button" variant="destructive" className="w-full sm:w-auto" onClick={() => handleDelete(toDelete)}>
                   Supprimer définitivement
                 </Button>
               </DialogFooter>
             </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contenu principal */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : budgets.length > 0 ? (
        <div className="space-y-6">
          {/* Bannière de synthèse très discrète (pas de grosse carte) */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-muted/30 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Budget Global</p>
                <p className="text-lg font-bold">{formatter.format(globalMontantTotal)}</p>
              </div>
            </div>
            
            <div className="w-px h-10 bg-border hidden sm:block"></div>
            
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Consommé</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  <p className="font-semibold">{formatter.format(globalUtilise)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Restant</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <p className="font-semibold">{formatter.format(globalRestant)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Liste Ultra-Premium */}
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

              const isDepasse = statut === "depasse"
              const isAttention = statut === "attention"

              return (
                <li
                  key={b._id}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-card/40 p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:bg-card hover:border-border/80 flex flex-col sm:flex-row sm:items-center gap-6",
                    isDepasse && "border-red-200/50 dark:border-red-900/30 bg-red-50/10 dark:bg-red-950/10",
                    isAttention && "border-amber-200/50 dark:border-amber-900/30"
                  )}
                >
                  {/* Icône de catégorie ou Wallet générique */}
                  <div className={cn(
                    "flex-shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105",
                    isDepasse ? "bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400" :
                    isAttention ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400" :
                    "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                  )}>
                    {isDepasse ? <AlertCircle className="h-6 w-6" /> : isAttention ? <Target className="h-6 w-6" /> : <Wallet className="h-6 w-6" />}
                  </div>

                  {/* Info Titre */}
                  <div className="sm:w-1/4 min-w-[180px]">
                    <h3 className="text-lg font-bold tracking-tight mb-1">{b.nom}</h3>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      {b.categorie || "Toutes catégories"} 
                      <span className="h-1 w-1 rounded-full bg-border"></span>
                      <span className="capitalize">{b.periode}</span>
                    </p>
                  </div>

                  {/* Barre de Progression et Nombres */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-end justify-between mb-2.5">
                      <div>
                        <span className="text-lg font-bold tabular-nums leading-none">
                          {formatter.format(utilise)}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground/80 tabular-nums ml-1">
                          / {formatter.format(b.montant)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-sm font-bold tabular-nums px-2.5 py-1 rounded-full",
                          isDepasse ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" : 
                          isAttention ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" : 
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                        )}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    <ProgressBar statut={statut} pourcentage={pct} />
                    
                    <div className="mt-2.5 flex items-center justify-between text-xs font-medium">
                      {isDepasse ? (
                         <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                           Dépassé de {formatter.format(Math.abs(restant))}
                         </span>
                      ) : (
                         <span className="text-muted-foreground">
                           Reste <span className="text-foreground">{formatter.format(restant)}</span>
                         </span>
                      )}
                      
                      {previsionFin != null && !isDepasse && (
                        <span className="text-muted-foreground/70">
                          Projection : ~{formatter.format(previsionFin)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions (toujours visible sur mobile, hover sur desktop) */}
                  <div className="flex sm:flex-col shrink-0 gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 w-full sm:w-auto mt-2 sm:mt-0 justify-end sm:justify-center border-t sm:border-t-0 sm:border-l border-border/50 pt-3 sm:pt-0 sm:pl-4">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full" onClick={() => openEdit(b)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" onClick={() => setToDelete(b)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-3xl border-dashed bg-muted/10 h-[40vh]">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">Aucun budget défini</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            Vous n&apos;avez pas encore créé d&apos;enveloppes budgétaires. Celles-ci vous permettent de recevoir des alertes pour ne pas dépenser excessivement.
          </p>
          <Button className="gap-2 rounded-full px-8 h-12 shadow-md hover:shadow-lg transition-all" onClick={() => setOpen(true)}>
            <Plus className="h-5 w-5" />
            Créer votre premier budget
          </Button>
        </div>
      )}
    </div>
  )
}
