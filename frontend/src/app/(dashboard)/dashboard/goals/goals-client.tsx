"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, ShieldCheck, Target, Rocket, CreditCard, ChevronRight, TrendingUp,Sparkles } from "lucide-react"
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

const typeObjectifOptions = [
  { value: "epargne", label: "Épargne Standard" },
  { value: "fonds_urgence", label: "Fonds d'Urgence" },
  { value: "projet", label: "Grand Projet" },
  { value: "remboursement", label: "Désendettement" },
] as const

const objectifFormSchema = z.object({
  nom: z.string().min(1, "Veuillez entrer un nom").max(100).trim(),
  montantCible: z.number().positive("Le montant doit être supérieur à 0").finite(),
  dateLimite: z.string().min(1, "Veuillez choisir une date"),
  type: z.enum(["epargne", "remboursement", "fonds_urgence", "projet"]),
  description: z.string().max(500).trim().optional(),
})

type ObjectifFormValues = z.infer<typeof objectifFormSchema>

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

const formatter = new Intl.NumberFormat("fr-MA", { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 });

function chargerObjectifs(setObjectifs: (o: Objectif[]) => void, setLoading: (l: boolean) => void) {
  setLoading(true)
  api
    .get<{ objectifs: Objectif[] }>("/api/objectifs")
    .then((res) => {
      if (res.succes && res.donnees?.objectifs) {
        // Sort by dateLimite ascending (closest first)
        const sorted = res.donnees.objectifs.sort((a, b) => new Date(a.dateLimite).getTime() - new Date(b.dateLimite).getTime())
        setObjectifs(sorted)
      }
    })
    .finally(() => setLoading(false))
}

function ProgressBar({ pourcentage, type }: { pourcentage: number, type: string }) {
  const pct = Math.min(100, Math.max(0, pourcentage))

  let gradientClass = "bg-blue-500"
  let bgClass = "bg-blue-100 dark:bg-blue-950/40"
  let shadowClass = "shadow-[0_0_10px_rgba(59,130,246,0.3)]"

  if (pct >= 100) {
    gradientClass = "bg-emerald-500"
    bgClass = "bg-emerald-100 dark:bg-emerald-950/40"
    shadowClass = "shadow-[0_0_10px_rgba(16,185,129,0.3)]"
  } else if (type === "fonds_urgence") {
    gradientClass = "bg-violet-500"
    bgClass = "bg-violet-100 dark:bg-violet-950/40"
    shadowClass = "shadow-[0_0_10px_rgba(139,92,246,0.3)]"
  } else if (type === "remboursement") {
    gradientClass = "bg-rose-500"
    bgClass = "bg-rose-100 dark:bg-rose-950/40"
    shadowClass = "shadow-[0_0_10px_rgba(244,63,94,0.3)]"
  }

  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full", bgClass)}>
      <div
        className={cn("h-full rounded-full transition-all duration-1000 ease-out", gradientClass, pct > 5 && shadowClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function getTypeIcon(type: string, sizeClass = "h-6 w-6") {
  switch (type) {
    case "epargne": return <TrendingUp className={sizeClass} />
    case "fonds_urgence": return <ShieldCheck className={sizeClass} />
    case "projet": return <Rocket className={sizeClass} />
    case "remboursement": return <CreditCard className={sizeClass} />
    default: return <Target className={sizeClass} />
  }
}

function getTypeColors(type: string) {
  switch (type) {
    case "epargne": return "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20"
    case "fonds_urgence": return "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-500/20"
    case "projet": return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
    case "remboursement": return "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20"
    default: return "bg-zinc-50 dark:bg-zinc-800/10 text-zinc-600 dark:text-zinc-400 border-zinc-100 dark:border-zinc-700/20"
  }
}

export function GoalsClient() {
  const [objectifs, setObjectifs] = useState<Objectif[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Objectif | null>(null)
  const [toDelete, setToDelete] = useState<Objectif | null>(null)
  const [contributionObjectif, setContributionObjectif] = useState<Objectif | null>(null)
  const [contributionMontant, setContributionMontant] = useState("")
  const [contributing, setContributing] = useState(false)

  useEffect(() => {
    chargerObjectifs(setObjectifs, setLoading)
  }, [])

  const form = useForm<ObjectifFormValues>({
    mode: "onBlur",
    resolver: zodResolver(objectifFormSchema),
    defaultValues: {
      nom: "",
      montantCible: 0,
      dateLimite: "",
      type: "epargne",
      description: "",
    },
  })

  async function onContribution() {
    if (!contributionObjectif || !contributionMontant) return
    const montant = Number(contributionMontant)
    if (!(montant > 0)) return
    setContributing(true)
    const res = await api.post<{ objectif: Objectif }>(
      `/api/objectifs/${contributionObjectif._id}/contribution`,
      { montant }
    )
    setContributing(false)
    if (res.succes) {
      toast.success("Contribution validée avec succès !")
      setContributionObjectif(null)
      setContributionMontant("")
      chargerObjectifs(setObjectifs, setLoading)
    } else {
      toast.error(res.message ?? "Erreur lors de la contribution")
    }
  }

  function openEdit(o: Objectif) {
    setEditing(o)
    const dateStr = o.dateLimite ? new Date(o.dateLimite).toISOString().slice(0, 10) : ""
    form.reset({
      nom: o.nom,
      montantCible: o.montantCible,
      dateLimite: dateStr,
      type: o.type as ObjectifFormValues["type"],
      description: (o as { description?: string }).description ?? "",
    })
  }

  async function onSubmit(data: ObjectifFormValues) {
    if (editing) {
      const res = await api.put<{ objectif: Objectif }>(`/api/objectifs/${editing._id}`, {
        nom: data.nom,
        montantCible: data.montantCible,
        dateLimite: data.dateLimite,
        type: data.type,
        ...(data.description !== undefined ? { description: data.description || null } : {}),
      })
      if (res.succes) {
        toast.success("Objectif enregistré")
        setEditing(null)
        chargerObjectifs(setObjectifs, setLoading)
      } else toast.error(res.message ?? "Erreur")
      return
    }
    const res = await api.post<{ objectif: Objectif }>("/api/objectifs", {
      nom: data.nom,
      montantCible: data.montantCible,
      dateLimite: data.dateLimite,
      type: data.type,
      ...(data.description ? { description: data.description } : {}),
    })
    if (res.succes) {
      toast.success("Objectif créé")
      form.reset({ nom: "", montantCible: 0, dateLimite: "", type: "epargne", description: "" })
      setOpen(false)
      chargerObjectifs(setObjectifs, setLoading)
    } else toast.error(res.message ?? "Erreur")
  }

  async function handleDelete(o: Objectif) {
    const res = await api.delete(`/api/objectifs/${o._id}`)
    if (res.succes) {
      toast.success("Objectif supprimé")
      setToDelete(null)
      chargerObjectifs(setObjectifs, setLoading)
    } else toast.error(res.message ?? "Erreur")
  }

  const globalTotalCible = objectifs.reduce((sum, o) => sum + o.montantCible, 0)
  const globalTotalActuel = objectifs.reduce((sum, o) => sum + o.montantActuel, 0)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 md:pt-6 bg-zinc-50/50 dark:bg-zinc-950/20 min-h-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Objectifs</h1>
          <p className="text-zinc-500 mt-1 block">Visualisez et planifiez vos rêves, une étape à la fois.</p>
        </div>
        <Dialog open={open && !editing} onOpenChange={(o) => { setOpen(o); if (!o) form.reset({ nom: "", montantCible: 0, dateLimite: "", type: "epargne", description: "" }) }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all rounded-xl px-5 h-11" onClick={() => setEditing(null)}>
              <Plus className="size-4" />
              Nouveau Projet
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl">
            <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/80 mb-2">
              <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Définir un cap</DialogTitle>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Qu&apos;avez-vous en tête ? Fixez le montant à atteindre.
              </p>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <Field className="col-span-2">
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Intitulé de l&apos;objectif</FieldLabel>
                  <Input placeholder="Ex: Tour du monde, Apport maison..." className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800" {...form.register("nom")} />
                  <FieldError errors={[form.formState.errors.nom]} />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Catégorie</FieldLabel>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {typeObjectifOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Montant visé (MAD)</FieldLabel>
                  <Input type="number" min={1} step={1} placeholder="100000" className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 font-semibold" {...form.register("montantCible", { valueAsNumber: true })} />
                  <FieldError errors={[form.formState.errors.montantCible]} />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Date limite souhaitée</FieldLabel>
                  <Input type="date" className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800" {...form.register("dateLimite")} />
                  <FieldError errors={[form.formState.errors.dateLimite]} />
                </Field>
              </div>
              <DialogFooter className="pt-4 mt-2">
                <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto hover:bg-zinc-100 dark:hover:bg-zinc-800 h-11" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" className="rounded-xl w-full sm:w-auto bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-11">Lancer l&apos;objectif</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl">
          <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800/80 mb-2">
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Ajuster l&apos;objectif</DialogTitle>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Vos plans changent ? Mettez à jour vos informations.
            </p>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <Field className="col-span-2">
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Intitulé de l&apos;objectif</FieldLabel>
                  <Input placeholder="Ex: Tour du monde, Apport maison..." className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800" {...form.register("nom")} />
                  <FieldError errors={[form.formState.errors.nom]} />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Catégorie</FieldLabel>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {typeObjectifOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Montant visé (MAD)</FieldLabel>
                  <Input type="number" min={1} step={1} className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 font-semibold" {...form.register("montantCible", { valueAsNumber: true })} />
                  <FieldError errors={[form.formState.errors.montantCible]} />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Date limite souhaitée</FieldLabel>
                  <Input type="date" className="h-11 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800" {...form.register("dateLimite")} />
                  <FieldError errors={[form.formState.errors.dateLimite]} />
                </Field>
              </div>
            <DialogFooter className="pt-4 mt-2">
              <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto hover:bg-zinc-100 dark:hover:bg-zinc-800 h-11" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="submit" className="rounded-xl w-full sm:w-auto bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-11">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!contributionObjectif} onOpenChange={(o) => !o && setContributionObjectif(null)}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl">
          {contributionObjectif && (
             <div className="flex flex-col gap-4">
               <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                    Propulser votre progression
                  </DialogTitle>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Saisissez le montant épargné ce mois-ci pour <strong className="text-zinc-900 dark:text-zinc-100">{contributionObjectif.nom}</strong>.
                  </p>
               </div>
               
               <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 mt-2">
                 <div className="flex justify-between items-center text-sm mb-1.5">
                   <span className="text-zinc-500 dark:text-zinc-400">Objectif total</span>
                   <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatter.format(contributionObjectif.montantCible)}</span>
                 </div>
                 <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-2"></div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-zinc-500 dark:text-zinc-400">Ligne d&apos;arrivée dans</span>
                   <span className="font-bold text-blue-600 dark:text-blue-400">
                     {formatter.format(Math.max(0, contributionObjectif.montantCible - contributionObjectif.montantActuel))}
                   </span>
                 </div>
               </div>

               <Field className="mt-2">
                 <FieldLabel className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Nouveau versement (MAD)</FieldLabel>
                 <Input
                   type="number"
                   min={1}
                   step={1}
                   placeholder="Ex: 500"
                   className="h-12 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 font-semibold text-lg"
                   value={contributionMontant}
                   onChange={(e) => setContributionMontant(e.target.value)}
                   autoFocus
                 />
               </Field>

               <DialogFooter className="mt-4 flex gap-2">
                 <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto hover:bg-zinc-100 dark:hover:bg-zinc-800 h-11 font-medium" onClick={() => setContributionObjectif(null)}>
                   Plus tard
                 </Button>
                 <Button
                   className="rounded-xl w-full sm:w-auto bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 h-11 gap-1 font-semibold"
                   onClick={onContribution}
                   disabled={contributing || !contributionMontant || Number(contributionMontant) <= 0}
                 >
                   Valider l&apos;ajout
                   <ChevronRight className="h-4 w-4" />
                 </Button>
               </DialogFooter>
             </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shadow-xl">
          {toDelete && (
             <div className="flex flex-col gap-4">
               <div>
                  <DialogTitle className="text-xl text-rose-600 flex items-center gap-2">
                    Abandonner cet objectif ?
                  </DialogTitle>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Vous êtes sur le point de supprimer le suivi de <strong className="text-zinc-900 dark:text-zinc-100">{toDelete.nom}</strong>. L&apos;argent épargné reste évidemment sur vos comptes, seul ce tableau de bord sera supprimé.
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


      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-3xl" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : objectifs.length > 0 ? (
        <div className="space-y-6">
          {/* Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-center">
                 <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Masse Épargnée</p>
                 <h3 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">{formatter.format(globalTotalActuel)}</h3>
                 <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                   Progression de votre capital
                 </div>
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-center">
                 <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                   <Target className="size-24" />
                 </div>
                 <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Valeur Cible Globale</p>
                 <h3 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 tabular-nums">{formatter.format(globalTotalCible)}</h3>
                 <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                   Somme de vos rêves réalisés
                 </div>
              </div>
          </div>

          {/* List of Goals */}
          <div className="space-y-3">
            {objectifs.map((o) => {
              const estAcheve = (o.progression?.pourcentageComplete ?? 0) >= 100
              const typeLabel = typeObjectifOptions.find((t) => t.value === o.type)?.label ?? o.type

              return (
                <div
                  key={o._id}
                  className={cn(
                    "group relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-5 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700",
                    estAcheve ? "border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-950/10" : ""
                  )}
                >
                  {/* Icon & Title */}
                  <div className="flex items-center gap-4 sm:w-1/3 min-w-48">
                    <div className={cn(
                      "shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 border shadow-xs",
                      !estAcheve ? getTypeColors(o.type) : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                    )}>
                      {estAcheve ? <Sparkles className="size-6" /> : getTypeIcon(o.type, "size-6")}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">{o.nom}</h3>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        {typeLabel}
                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                        <span className={cn(new Date(o.dateLimite) < new Date() && !estAcheve ? "text-rose-600 dark:text-rose-400 font-semibold" : "")}>
                           Échéance : {new Date(o.dateLimite).toLocaleDateString("fr-FR")}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="flex-1 flex flex-col gap-2 w-full min-w-32 max-w-sm">
                    <div className="flex justify-between items-end px-1">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {formatter.format(o.montantActuel)}
                      </span>
                      <span className="text-xs font-semibold text-zinc-400 tabular-nums">
                        / {formatter.format(o.montantCible)}
                      </span>
                    </div>
                    <ProgressBar pourcentage={o.progression?.pourcentageComplete ?? 0} type={o.type} />
                  </div>

                  {/* Pourcentages et Actions */}
                  <div className="sm:w-1/4 flex items-center justify-between sm:justify-end gap-5 border-t border-zinc-100 dark:border-zinc-800/80 sm:border-t-0 pt-4 sm:pt-0">
                    <div className="flex flex-col items-start sm:items-end">
                      <span className={cn(
                        "text-xl font-extrabold tabular-nums tracking-tight",
                         estAcheve ? "text-emerald-600 dark:text-emerald-400" :
                         o.type === 'fonds_urgence' ? "text-violet-600 dark:text-violet-400" :
                         o.type === 'remboursement' ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                      )}>
                        {(o.progression?.pourcentageComplete ?? 0).toFixed(0)}%
                      </span>
                      <span className="text-xs font-semibold text-zinc-500 mt-0.5">
                        {estAcheve ? "Objectif Atteint 🎉" : "Reste " + formatter.format(Math.max(0, o.montantCible - o.montantActuel))}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {!estAcheve && (
                        <Button size="icon" variant="ghost" className="h-10 w-10 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full" onClick={() => { setContributionObjectif(o); setContributionMontant("") }}>
                          <Plus className="size-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full" onClick={() => openEdit(o)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-10 w-10 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 rounded-full" onClick={() => setToDelete(o)}>
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
          <h3 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-100">Aucun objectif défini</h3>
          <p className="text-zinc-500 text-base max-w-md mx-auto mb-8 leading-relaxed">
            Définissez des objectifs d&apos;épargne clairs pour vos grands projets (voyages, maison, fonds de sécurité) et suivez votre progression.
          </p>
          <Button className="gap-2 rounded-xl px-8 h-12 shadow-sm bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all font-semibold" onClick={() => setOpen(true)}>
            <Plus className="size-5" />
            Créer mon premier objectif
          </Button>
        </div>
      )}
    </div>
  )
}
