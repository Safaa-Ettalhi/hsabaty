"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, ShieldCheck, Target, Rocket, CreditCard, ChevronRight, TrendingUp, AlertCircle, Sparkles } from "lucide-react"
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

  let gradientClass = "bg-linear-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700"
  let bgClass = "bg-blue-100 dark:bg-blue-950/40"
  let shadowClass = "shadow-[0_0_10px_rgba(59,130,246,0.3)]"

  if (pct >= 100) {
    gradientClass = "bg-linear-to-r from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-600"
    bgClass = "bg-emerald-100 dark:bg-emerald-950/40"
    shadowClass = "shadow-[0_0_10px_rgba(16,185,129,0.3)]"
  } else if (type === "fonds_urgence") {
    gradientClass = "bg-linear-to-r from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700"
    bgClass = "bg-violet-100 dark:bg-violet-950/40"
    shadowClass = "shadow-[0_0_10px_rgba(139,92,246,0.3)]"
  } else if (type === "remboursement") {
    gradientClass = "bg-linear-to-r from-rose-400 to-rose-500 dark:from-rose-500 dark:to-rose-600"
    bgClass = "bg-rose-100 dark:bg-rose-950/40"
    shadowClass = "shadow-[0_0_10px_rgba(244,63,94,0.3)]"
  }

  return (
    <div className={cn("h-3 w-full overflow-hidden rounded-full", bgClass)}>
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
    case "epargne": return "bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/50"
    case "fonds_urgence": return "bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-200/50"
    case "projet": return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/50"
    case "remboursement": return "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200/50"
    default: return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200"
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
  const globalPct = globalTotalCible > 0 ? (globalTotalActuel / globalTotalCible) * 100 : 0
  const achevesCount = objectifs.filter(o => (o.progression?.pourcentageComplete ?? 0) >= 100).length

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vos Objectifs</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Visualisez et planifiez vos rêves, une étape à la fois.
          </p>
        </div>
        <Dialog open={open && !editing} onOpenChange={(o) => { setOpen(o); if (!o) form.reset({ nom: "", montantCible: 0, dateLimite: "", type: "epargne", description: "" }) }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm rounded-full px-6" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              Nouvel Objectif
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-lg">Définir un cap</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Qu&apos;avez-vous en tête ? Fixez le montant à atteindre.
              </p>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field className="col-span-2">
                  <FieldLabel className="text-sm font-medium mb-1.5">Intitulé de l&apos;objectif</FieldLabel>
                  <Input placeholder="Ex: Tour du monde, Apport maison..." className="h-10 text-base" {...form.register("nom")} />
                  <FieldError errors={[form.formState.errors.nom]} />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-medium mb-1.5">Catégorie</FieldLabel>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {typeObjectifOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-medium mb-1.5">Montant visé (MAD)</FieldLabel>
                  <Input type="number" min={1} step={1} placeholder="100000" className="h-10" {...form.register("montantCible", { valueAsNumber: true })} />
                  <FieldError errors={[form.formState.errors.montantCible]} />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel className="text-sm font-medium mb-1.5">Date limite souhaitée</FieldLabel>
                  <Input type="date" className="h-10" {...form.register("dateLimite")} />
                  <FieldError errors={[form.formState.errors.dateLimite]} />
                </Field>
              </div>
              <DialogFooter className="pt-4 flex gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>Annuler</Button>
                <Button type="submit" className="w-full sm:w-auto">Lancer l&apos;objectif</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-lg">Ajuster l&apos;objectif</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Vos plans changent ? Mettez à jour vos informations.
            </p>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <Field className="col-span-2">
                  <FieldLabel className="text-sm font-medium mb-1.5">Intitulé de l&apos;objectif</FieldLabel>
                  <Input placeholder="Ex: Tour du monde, Apport maison..." className="h-10 text-base" {...form.register("nom")} />
                  <FieldError errors={[form.formState.errors.nom]} />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-medium mb-1.5">Catégorie</FieldLabel>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {typeObjectifOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-sm font-medium mb-1.5">Montant visé (MAD)</FieldLabel>
                  <Input type="number" min={1} step={1} className="h-10" {...form.register("montantCible", { valueAsNumber: true })} />
                  <FieldError errors={[form.formState.errors.montantCible]} />
                </Field>
                <Field className="col-span-2">
                  <FieldLabel className="text-sm font-medium mb-1.5">Date limite souhaitée</FieldLabel>
                  <Input type="date" className="h-10" {...form.register("dateLimite")} />
                  <FieldError errors={[form.formState.errors.dateLimite]} />
                </Field>
              </div>
            <DialogFooter className="pt-4 flex gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="submit" className="w-full sm:w-auto">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!contributionObjectif} onOpenChange={(o) => !o && setContributionObjectif(null)}>
        <DialogContent className="sm:max-w-md p-6">
          {contributionObjectif && (
            <div className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  Alimenter votre progression
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Ajoutez un versement à <strong className="text-foreground">{contributionObjectif.nom}</strong> pour vous rapprocher du but !
                </p>
              </DialogHeader>
              <div className="rounded-lg border bg-emerald-50/50 dark:bg-emerald-500/5 p-4 flex flex-col gap-2 mt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Objectif total</span>
                  <span className="font-semibold">{formatter.format(contributionObjectif.montantCible)}</span>
                </div>
                <div className="w-full h-px bg-border/50"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Montant manquant</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatter.format(Math.max(0, contributionObjectif.montantCible - contributionObjectif.montantActuel))}
                  </span>
                </div>
              </div>
              <Field className="mt-2">
                <FieldLabel className="text-sm font-medium mb-1.5">Nouveau versement (MAD)</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Ex: 500"
                  className="h-12 text-lg font-bold"
                  value={contributionMontant}
                  onChange={(e) => setContributionMontant(e.target.value)}
                  autoFocus
                />
              </Field>
              <DialogFooter className="mt-4 flex gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setContributionObjectif(null)}>
                  Plus tard
                </Button>
                <Button
                  className="w-full sm:w-auto gap-2"
                  onClick={onContribution}
                  disabled={contributing || !contributionMontant || Number(contributionMontant) <= 0}
                >
                  Valider le versement
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md p-6">
          {toDelete && (
            <div className="flex flex-col gap-5">
              <DialogHeader>
                <DialogTitle className="text-lg flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-5 w-5" />
                  Abandonner cet objectif
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer <strong className="text-foreground">{toDelete.nom}</strong> ? L&apos;historique de cette progression sera perdu. (L&apos;argent réel sur vos comptes n&apos;est pas affecté).
                </p>
              </DialogHeader>
              <DialogFooter className="flex gap-2">
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


      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : objectifs.length > 0 ? (
        <div className="space-y-6">
          {/* Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-muted/30 px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cumul des objectifs</p>
                <p className="text-lg font-bold">{formatter.format(globalTotalCible)}</p>
              </div>
            </div>

            <div className="w-px h-10 bg-border hidden md:block"></div>

            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Avancement</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <p className="font-semibold">{formatter.format(globalTotalActuel)} <span className="text-muted-foreground text-xs font-normal">({globalPct.toFixed(1)}%)</span></p>
                </div>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Achevés</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <p className="font-semibold">{achevesCount} / {objectifs.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* List of Goals */}
          <ul className="space-y-4">
            {objectifs.map((o) => {
              const estAcheve = (o.progression?.pourcentageComplete ?? 0) >= 100
              const typeLabel = typeObjectifOptions.find((t) => t.value === o.type)?.label ?? o.type

              return (
                <li
                  key={o._id}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-card/40 p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:bg-card hover:border-border/80 flex flex-col lg:flex-row lg:items-center gap-6",
                    estAcheve ? "border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-950/10" : ""
                  )}
                >
                  {/* Icon & Title */}
                  <div className="lg:w-1/3 min-w-48 flex items-center gap-4">
                    <div className={cn(
                      "shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 border",
                      getTypeColors(o.type)
                    )}>
                      {getTypeIcon(o.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold tracking-tight mb-1">{o.nom}</h3>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        {typeLabel}
                        <span className="h-1 w-1 rounded-full bg-border"></span>
                        <span className={cn("flex items-center gap-1", new Date(o.dateLimite) < new Date() && !estAcheve ? "text-rose-600 dark:text-rose-400" : "")}>
                           Échéance : {new Date(o.dateLimite).toLocaleDateString("fr-FR")}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex-1 min-w-50">
                    <div className="flex items-end justify-between mb-2.5">
                      <div>
                        <span className="text-lg font-bold tabular-nums leading-none">
                          {formatter.format(o.montantActuel)}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground/80 tabular-nums ml-1">
                          / {formatter.format(o.montantCible)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-sm font-bold tabular-nums px-2.5 py-1 rounded-full",
                          estAcheve ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" :
                          "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                        )}>
                          {(o.progression?.pourcentageComplete ?? 0).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <ProgressBar pourcentage={o.progression?.pourcentageComplete ?? 0} type={o.type} />

                    <div className="mt-2.5 flex items-center justify-between text-xs font-medium">
                      {!estAcheve && o.progression?.montantMensuelRequis !== undefined && o.progression.montantMensuelRequis > 0 ? (
                        <span className="text-muted-foreground/80 flex items-center gap-1">
                          Recommandé : <span className="text-foreground">{formatter.format(Math.ceil(o.progression.montantMensuelRequis))} / mois</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/80">
                           {estAcheve ? "Objectif atteint 🎉" : "En cours"}
                        </span>
                      )}
                      
                      {!estAcheve && (
                        <span className="text-muted-foreground">
                          Reste <span className="text-foreground">{formatter.format(Math.max(0, (o.progression?.montantRestant ?? o.montantCible - o.montantActuel)))}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col shrink-0 gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200 w-full lg:w-auto mt-2 lg:mt-0 justify-end lg:justify-center border-t lg:border-t-0 lg:border-l border-border/50 pt-3 lg:pt-0 lg:pl-4">
                    {!estAcheve && (
                      <Button variant="default" size="sm" className="hidden lg:flex w-full whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md" onClick={() => { setContributionObjectif(o); setContributionMontant("") }}>
                        <Plus className="h-4 w-4 mr-1" /> Contribuer
                      </Button>
                    )}
                    
                    <div className="flex gap-2 justify-end w-full">
                       {!estAcheve && (
                         <Button variant="outline" size="sm" className="lg:hidden rounded-full shadow-xs" onClick={() => { setContributionObjectif(o); setContributionMontant("") }}>
                           Contribuer
                         </Button>
                       )}
                       <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full" onClick={() => openEdit(o)}>
                         <Pencil className="size-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full" onClick={() => setToDelete(o)}>
                         <Trash2 className="size-4" />
                       </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-3xl border-dashed bg-muted/10 h-[40vh]">
          <div className="h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-5">
            <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">Aucun objectif défini</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            Définissez des objectifs d&apos;épargne clairs pour vos grands projets (voyages, maison, fonds de sécurité) et suivez votre progression.
          </p>
          <Button className="gap-2 rounded-full px-8 h-12 shadow-md hover:shadow-lg transition-all" onClick={() => setOpen(true)}>
            <Plus className="h-5 w-5" />
            Lancer un objectif
          </Button>
        </div>
      )}
    </div>
  )
}
