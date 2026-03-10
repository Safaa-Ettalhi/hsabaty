/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, RefreshCw, Pencil, Trash2, CalendarSync, ArrowUpCircle, ArrowDownCircle, AlertCircle, Clock, Zap, Wallet } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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

const frequenceOptions = [
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "mensuel", label: "Mensuel" },
  { value: "trimestriel", label: "Trimestriel" },
  { value: "annuel", label: "Annuel" },
] as const

const schema = z.object({
  description: z.string().min(1, "Requis").max(500).trim(),
  montant: z.number().positive("Montant > 0").finite(),
  type: z.enum(["revenu", "depense"]),
  categorie: z.string().min(1, "Requis").max(100).trim(),
  frequence: z.enum(["hebdomadaire", "mensuel", "trimestriel", "annuel"]),
})

type FormValues = z.infer<typeof schema>

type Recurrente = {
  _id: string
  description: string
  montant: number
  type: string
  categorie: string
  frequence: string
  prochaineDate: string
}

type Res = { transactionsRecurrentes: Recurrente[]; totalMensuel: number }

const formatter = new Intl.NumberFormat("fr-MA", { style: 'currency', currency: 'MAD', maximumFractionDigits: 2 });

export function RecurringClient() {
  const [data, setData] = useState<Res | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Recurrente | null>(null)
  const [toDelete, setToDelete] = useState<Recurrente | null>(null)
  const [generating, setGenerating] = useState(false)

  function load() {
    setLoading(true)
    api.get<Res>("/api/transactions-recurrentes").then((res) => {
      if (res.succes && res.donnees) setData(res.donnees)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      montant: 0,
      type: "depense",
      categorie: "",
      frequence: "mensuel",
    },
  })

  function openEdit(r: Recurrente) {
    setEditing(r)
    form.reset({
      description: r.description,
      montant: r.montant,
      type: r.type as "revenu" | "depense",
      categorie: r.categorie,
      frequence: r.frequence as FormValues["frequence"],
    })
  }

  async function onSubmit(v: FormValues) {
    if (editing) {
      const res = await api.put(`/api/transactions-recurrentes/${editing._id}`, v)
      if (res.succes) {
        toast.success("Récurrente modifiée")
        setEditing(null)
        setOpen(false)
        form.reset({ description: "", montant: 0, type: "depense", categorie: "", frequence: "mensuel" })
        load()
      } else toast.error(res.message ?? "Erreur")
    } else {
      const res = await api.post("/api/transactions-recurrentes", v)
      if (res.succes) {
        toast.success("Abonnement créé avec succès")
        form.reset({ description: "", montant: 0, type: "depense", categorie: "", frequence: "mensuel" })
        setOpen(false)
        load()
      } else toast.error(res.message ?? "Erreur")
    }
  }

  async function handleDelete(r: Recurrente) {
    const res = await api.delete(`/api/transactions-recurrentes/${r._id}`)
    if (res.succes) {
      toast.success("Abonnement supprimé")
      setToDelete(null)
      load()
    } else toast.error(res.message ?? "Erreur")
  }

  async function handleGenerer() {
    setGenerating(true)
    const res = await api.get<{ message?: string; donnees?: { transactions: unknown[] } }>("/api/transactions-recurrentes/generer")
    setGenerating(false)
    if (res.succes) {
      const n = (res.donnees as any)?.transactions?.length ?? 0
      toast.success(n ? `${n} transaction(s) générée(s)` : "Vos transactions sont déjà à jour !")
      load()
    } else toast.error(res.message ?? "Erreur")
  }

  const abonnements = data?.transactionsRecurrentes?.filter(t => t.type === 'depense') || [];
  const salaires = data?.transactionsRecurrentes?.filter(t => t.type === 'revenu') || [];
  const impactMensuel = data?.totalMensuel ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 md:pt-6 bg-zinc-50/50 dark:bg-zinc-950/20 min-h-full">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Récurrentes</h1>
          <p className="text-zinc-500 mt-1 block">Pilotez et anticipez vos abonnements et entrées fixes.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className={cn("gap-2 shadow-sm bg-white dark:bg-zinc-900 h-10 px-4 rounded-xl transition-all", generating && "opacity-80 pointer-events-none")} 
            onClick={handleGenerer}
          >
            <RefreshCw className={cn("size-4 text-emerald-600 dark:text-emerald-400", generating && "animate-spin")} />
            {generating ? "Vérification..." : "Générer les échues"}
          </Button>

          <Dialog open={open && !editing} onOpenChange={(o) => { setOpen(o); if (!o) form.reset({ description: "", montant: 0, type: "depense", categorie: "", frequence: "mensuel" }) }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-md hover:shadow-lg transition-shadow bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 h-10">
                <Plus className="size-4" />
                Nouveau
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-6 rounded-2xl border-zinc-200 dark:border-zinc-800">
              <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                <DialogTitle className="text-xl">
                  Nouvelle Opération Récurrente
                </DialogTitle>
                <p className="text-sm text-zinc-500 mt-1">
                  Automatisez vos dépenses (ex: Netflix) ou vos revenus (ex: Salaire).
                </p>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <Field>
                  <FieldLabel className="text-sm font-medium">Description</FieldLabel>
                  <Input placeholder="Ex. Abonnement Spotify" className="h-10 rounded-xl" {...form.register("description")} />
                  <FieldError errors={[form.formState.errors.description]} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="text-sm font-medium">Montant</FieldLabel>
                    <Input type="number" min={0.01} step={0.01} className="h-10 rounded-xl" {...form.register("montant", { valueAsNumber: true })} />
                    <FieldError errors={[form.formState.errors.montant]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm font-medium">Fréquence</FieldLabel>
                    <Controller control={form.control} name="frequence" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {frequenceOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="text-sm font-medium">Type de Flux</FieldLabel>
                    <Controller control={form.control} name="type" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={cn("h-10 rounded-xl font-medium", field.value === 'depense' ? 'text-rose-600' : 'text-emerald-600')}><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="depense">Dépense (-)</SelectItem>
                          <SelectItem value="revenu">Revenu (+)</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm font-medium">Catégorie</FieldLabel>
                    <Input placeholder="Ex. Loisirs" className="h-10 rounded-xl" {...form.register("categorie")} />
                    <FieldError errors={[form.formState.errors.categorie]} />
                  </Field>
                </div>
                <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                  <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" className="rounded-xl w-full sm:w-auto bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* EDIT DIALOG */}
          <Dialog open={!!editing} onOpenChange={(o) => (!o) && setEditing(null)}>
            <DialogContent className="sm:max-w-md p-6 rounded-2xl border-zinc-200 dark:border-zinc-800">
              <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                <DialogTitle className="text-xl">Modifier une Récurrence</DialogTitle>
                <p className="text-sm text-zinc-500 mt-1">Ajustez le montant ou la fréquence d&apos;exécution.</p>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <Field>
                  <FieldLabel className="text-sm font-medium">Description</FieldLabel>
                  <Input className="h-10 rounded-xl" {...form.register("description")} />
                  <FieldError errors={[form.formState.errors.description]} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="text-sm font-medium">Montant</FieldLabel>
                    <Input type="number" min={0.01} step={0.01} className="h-10 rounded-xl" {...form.register("montant", { valueAsNumber: true })} />
                    <FieldError errors={[form.formState.errors.montant]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm font-medium">Fréquence</FieldLabel>
                    <Controller control={form.control} name="frequence" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {frequenceOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="text-sm font-medium">Type</FieldLabel>
                    <Controller control={form.control} name="type" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={cn("h-10 rounded-xl font-medium", field.value === 'depense' ? 'text-rose-600' : 'text-emerald-600')}><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="depense">Dépense (-)</SelectItem>
                          <SelectItem value="revenu">Revenu (+)</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm font-medium">Catégorie</FieldLabel>
                    <Input className="h-10 rounded-xl" {...form.register("categorie")} />
                    <FieldError errors={[form.formState.errors.categorie]} />
                  </Field>
                </div>
                <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                  <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto" onClick={() => setEditing(null)}>Annuler</Button>
                  <Button type="submit" className="rounded-xl w-full sm:w-auto bg-blue-600 hover:bg-blue-700">Mettre à jour</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* DELETE DIALOG */}
          <Dialog open={!!toDelete} onOpenChange={(o) => (!o) && setToDelete(null)}>
            <DialogContent className="sm:max-w-md p-6 rounded-2xl">
              {toDelete && (
                <div className="flex flex-col gap-4">
                  <div>
                    <DialogTitle className="text-xl text-rose-600 flex items-center gap-2">
                      <AlertCircle className="size-5" />
                      Stopper cet abonnement ?
                    </DialogTitle>
                    <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                      L&apos;historique des opérations passées restera intact, mais le système arrêtera la génération automatique des futures échéances.
                    </p>
                  </div>
                  
                  <div className="rounded-xl border border-rose-100 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-500/5 p-4 flex flex-col gap-2 mt-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between text-base">
                      {toDelete.description}
                      <span className={cn("font-bold", toDelete.type === "depense" ? "text-rose-600" : "text-emerald-600")}>
                        {toDelete.type === "depense" ? "-" : "+"}{formatter.format(toDelete.montant)}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="bg-white dark:bg-zinc-800 px-2 py-1 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700 capitalize">{toDelete.frequence}</span>
                    </div>
                  </div>

                  <DialogFooter className="mt-4 flex gap-2">
                    <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setToDelete(null)}>
                      Ignorer
                    </Button>
                    <Button type="button" variant="destructive" className="rounded-xl w-full sm:w-auto shadow-md" onClick={() => handleDelete(toDelete)}>
                      Arrêter définitivement
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-950 p-5 shadow-sm text-white">
           <div className="absolute top-0 right-0 p-4 opacity-5">
             <CalendarSync className="size-24" />
           </div>
           <p className="text-sm font-medium text-zinc-300 mb-1">Impact Mensuel Total</p>
           <h3 className="text-3xl font-bold">{impactMensuel > 0 ? '+' : ''}{formatter.format(impactMensuel)}</h3>
           <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
             Lissé sur 30 jours (revenus - abonnements)
           </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-center">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full">
               <ArrowDownCircle className="size-5" />
             </div>
             <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Abonnements actifs</p>
           </div>
           <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 pl-11">{abonnements.length} <span className="text-sm font-medium text-zinc-400">souscriptions</span></p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm flex flex-col justify-center">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
               <ArrowUpCircle className="size-5" />
             </div>
             <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Revenus actifs</p>
           </div>
           <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 pl-11">{salaires.length} <span className="text-sm font-medium text-zinc-400">sources fixes</span></p>
        </div>
      </div>

      {/* RECURRING LIST */}
      <Card className="border-border/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] bg-white dark:bg-zinc-900/50 rounded-3xl overflow-hidden mt-2">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
          ) : data?.transactionsRecurrentes?.length ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {data.transactionsRecurrentes.map((t) => {
                const isDepense = t.type === 'depense';
                const dateObj = new Date(t.prochaineDate);
                const isLate = dateObj < new Date(); 
                
                return (
                  <div key={t._id} className="group p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border",
                        isDepense 
                          ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                          : "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400"
                      )}>
                        {isDepense ? <Wallet className="size-5" /> : <Zap className="size-5" />}
                      </div>
                      
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">{t.description}</h4>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-md px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-800 bg-opacity-50">
                            {t.frequence}
                          </span>
                        </div>
                        <div className="flex items-center gap-x-2 gap-y-1 mt-1 font-medium">
                          <Badge variant="outline" className="text-xs font-medium text-zinc-500 border-zinc-200 dark:border-zinc-700 shadow-none hover:bg-transparent tracking-wide">
                            {t.categorie}
                          </Badge>
                          <span className="text-zinc-300 dark:text-zinc-600">•</span>
                          <span className={cn(
                            "text-xs flex items-center gap-1 wrap-break-word", 
                            isLate ? "text-amber-600 dark:text-amber-500 font-semibold" : "text-zinc-500"
                          )}>
                            <Clock className="size-3 -mt-0.5 shrink-0" />
                            {isLate ? "Génération en attente..." : `Prochaine le ${dateObj.toLocaleDateString("fr-FR", {day: "numeric", month: "long"})} ${dateObj.getFullYear() !== new Date().getFullYear() ? dateObj.getFullYear() : ''}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 sm:pl-0 pl-16">
                      <div className="text-left sm:text-right">
                        <span className={cn(
                          "font-bold text-lg tabular-nums tracking-tight whitespace-nowrap",
                          isDepense ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {!isDepense ? '+' : '-'}{formatter.format(t.montant)}
                        </span>
                        <p className="text-xs text-zinc-400 font-medium tracking-wide text-right hidden sm:block">Par {t.frequence === 'mensuel' ? 'mois' : t.frequence === 'hebdomadaire' ? 'semaine' : t.frequence === 'annuel' ? 'an' : 'trimestre'}</p>
                      </div>

                      <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-9 w-9 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full" onClick={() => openEdit(t)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 rounded-full" onClick={() => setToDelete(t)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center h-75">
              <div className="size-16 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                <CalendarSync className="size-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Aucun automatisme</h3>
              <p className="text-zinc-500 max-w-sm mx-auto text-sm leading-relaxed mb-6">
                Créez votre première récurrence pour que l&apos;application gère vos abonnements sans vous.
              </p>
              <Button className="rounded-xl px-6 gap-2 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200" onClick={() => { setEditing(null); setOpen(true); }}>
                <Plus className="size-4" />
                Automatiser un frais
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
