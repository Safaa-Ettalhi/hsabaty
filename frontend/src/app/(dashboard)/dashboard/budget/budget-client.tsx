"use client"

import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Wallet, Target, AlertCircle, TrendingDown} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
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

  let gradientClass = "bg-emerald-500"
  let bgClass = "bg-emerald-50 dark:bg-emerald-500/10"

  if (statut === "depasse") {
    gradientClass = "bg-rose-500"
    bgClass = "bg-rose-50 dark:bg-rose-500/10"
  } else if (statut === "attention") {
    gradientClass = "bg-amber-500"
    bgClass = "bg-amber-50 dark:bg-amber-500/10"
  }

  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full", bgClass)}>
      <div
        className={cn("h-full rounded-full transition-all duration-1000 ease-out", gradientClass)}
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
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 md:pt-6 bg-zinc-50/50 dark:bg-zinc-950/20 min-h-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Budgets</h1>
          <p className="text-zinc-500 mt-1 block">Fixez vos limites et contrôlez précisément vos dépenses.</p>
        </div>
        <Dialog open={open && !editing} onOpenChange={(o) => { setOpen(o); if (!o) form.reset({ nom: "", montant: 0, periode: "mensuel", categorie: "" }) }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-md hover:shadow-lg transition-shadow bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 h-10">
              <Plus className="size-4" />
              Nouveau Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl">
            <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/80 mb-2">
              <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Créer une enveloppe</DialogTitle>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Définissez un plafond de dépenses pour sécuriser votre épargne.
              </p>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Nom</FieldLabel>
                  <Input placeholder="Ex. Restaurants" className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800" {...form.register("nom")} />
                  <FieldError errors={[form.formState.errors.nom]} />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Période</FieldLabel>
                  <Controller
                    control={form.control}
                    name="periode"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
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
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Plafond (MAD)</FieldLabel>
                  <Input type="number" min={1} step={1} placeholder="3000" className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 font-semibold" {...form.register("montant", { valueAsNumber: true })} />
                  <FieldError errors={[form.formState.errors.montant]} />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 text-optional">Catégorie associée</FieldLabel>
                  <Input placeholder="Ex. Loisirs" className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800" {...form.register("categorie")} />
                </Field>
              </div>
              <DialogFooter className="pt-4 mt-2">
                <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto hover:bg-zinc-100 dark:hover:bg-zinc-800 h-11" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" className="rounded-xl w-full sm:w-auto bg-blue-600 hover:bg-blue-700 h-11">Enregistrer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl">
          <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/80 mb-2">
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Modifier le budget</DialogTitle>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Ajustez vos paramètres financiers pour cette enveloppe.
            </p>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Nom</FieldLabel>
                <Input className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800" {...form.register("nom")} />
                <FieldError errors={[form.formState.errors.nom]} />
              </Field>
              <Field>
                <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Période</FieldLabel>
                <Controller
                  control={form.control}
                  name="periode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
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
                <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Plafond (MAD)</FieldLabel>
                <Input type="number" min={1} step={1} className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 font-semibold" {...form.register("montant", { valueAsNumber: true })} />
                <FieldError errors={[form.formState.errors.montant]} />
              </Field>
              <Field>
                <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200 text-optional">Catégorie associée</FieldLabel>
                <Input className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800" {...form.register("categorie")} />
              </Field>
            </div>
            <DialogFooter className="pt-4 mt-2">
              <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto hover:bg-zinc-100 dark:hover:bg-zinc-800 h-11" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="submit" className="rounded-xl w-full sm:w-auto bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-11">Mettre à jour</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl">
          {toDelete && (
             <div className="flex flex-col gap-4">
               <div>
                  <DialogTitle className="text-xl text-rose-600 flex items-center gap-2">
                    Supprimer ce budget ?
                  </DialogTitle>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Son enveloppe de suivi sera supprimée, mais soyez sans crainte : <strong className="text-zinc-900 dark:text-zinc-100">vos transactions resteront intactes.</strong>
                  </p>
               </div>
               
               <div className="rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-500/5 p-4 flex flex-col gap-2 mt-2">
                 <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between text-base">
                   {toDelete.nom}
                   <span className="font-bold text-rose-600">
                     {formatter.format(toDelete.montant)}
                   </span>
                 </p>
               </div>

               <DialogFooter className="mt-4 flex gap-2">
                 <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto hover:bg-zinc-100 dark:hover:bg-zinc-800 h-11 font-medium" onClick={() => setToDelete(null)}>
                   Conserver
                 </Button>
                 <Button type="button" variant="destructive" className="rounded-xl w-full sm:w-auto shadow-sm hover:shadow-md bg-rose-600 hover:bg-rose-700 h-11 font-semibold" onClick={() => handleDelete(toDelete)}>
                   Oui, supprimer
                 </Button>
               </DialogFooter>
             </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contenu principal */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-3xl" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : budgets.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-center">
               <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Masse Budgétisée</p>
               <h3 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">{formatter.format(globalMontantTotal)}</h3>
               <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                 Total de vos plafonds
               </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-center">
               <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                 <TrendingDown className="size-24" />
               </div>
               <p className="text-sm font-semibold text-rose-700/80 dark:text-rose-400/80 mb-1">Dépensé</p>
               <h3 className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">{formatter.format(globalUtilise)}</h3>
               <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                 <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Déjà consommé
               </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-950 p-6 shadow-sm text-white flex flex-col justify-center">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                 <Wallet className="size-24" />
               </div>
               <p className="text-sm font-semibold text-zinc-300 mb-1">Reste disponible</p>
               <h3 className="text-3xl font-extrabold tabular-nums tracking-tight text-white">{formatter.format(globalRestant)}</h3>
               <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                 Coussin sécuritaire
               </div>
            </div>
          </div>

          <div className="space-y-3">
            {budgets.map((b) => {
              const statut = b.statistiques?.statut ?? "ok"
              const pct = b.statistiques?.pourcentageUtilise ?? 0
              const restant = b.statistiques?.montantRestant ?? b.montant
              const utilise = b.statistiques?.montantUtilise ?? 0
              
              const isDepasse = statut === "depasse"
              const isAttention = statut === "attention"

              return (
                <div
                  key={b._id}
                  className={cn(
                    "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-5 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-4 sm:w-1/3 min-w-48">
                    <div className={cn(
                      "shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-105",
                      isDepasse ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20" :
                        isAttention ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" :
                          "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                    )}>
                      {isDepasse ? <AlertCircle className="size-6" /> : isAttention ? <Target className="size-6" /> : <Wallet className="size-6" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">{b.nom}</h3>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                        <span className="capitalize">{b.periode}</span>
                        {b.categorie && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                            <span>{b.categorie}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-2 w-full min-w-32 max-w-sm">
                    <div className="flex justify-between items-end px-1">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {formatter.format(utilise)}
                      </span>
                      <span className="text-xs font-semibold text-zinc-400 tabular-nums">
                        / {formatter.format(b.montant)}
                      </span>
                    </div>
                    <ProgressBar statut={statut} pourcentage={pct} />
                  </div>

                  <div className="sm:w-1/4 flex items-center justify-between sm:justify-end gap-5 border-t border-zinc-100 dark:border-zinc-800/80 sm:border-t-0 pt-4 sm:pt-0">
                    <div className="flex flex-col items-start sm:items-end">
                      <span className={cn(
                        "text-xl font-extrabold tabular-nums tracking-tight",
                         isDepasse ? "text-rose-600 dark:text-rose-400" :
                           isAttention ? "text-amber-600 dark:text-amber-400" :
                             "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {pct.toFixed(0)}%
                      </span>
                      <span className={cn(
                        "text-xs font-semibold mt-0.5",
                        isDepasse ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400"
                      )}>
                        {isDepasse ? "Dépassement de " + formatter.format(Math.abs(restant)) : "Reste " + formatter.format(restant)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full" onClick={() => openEdit(b)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-10 w-10 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 rounded-full" onClick={() => setToDelete(b)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-center h-125 border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 rounded-3xl">
          <div className="size-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5 shadow-sm border border-zinc-200 dark:border-zinc-700">
            <Target className="size-10 text-zinc-400" />
          </div>
          <h3 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">Aucun plafond de sécurité</h3>
          <p className="text-zinc-500 text-base max-w-md mx-auto mb-8 leading-relaxed">
            Configurez des enveloppes budgétaires (ex: Alimentation 3000 MAD) pour ne jamais dépenser plus que ce que vous avez décidé.
          </p>
          <Button className="gap-2 rounded-xl px-8 h-12 shadow-sm bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all font-semibold" onClick={() => setOpen(true)}>
            <Plus className="size-5" />
            Créer mon premier budget
          </Button>
        </div>
      )}
    </div>
  )
}
