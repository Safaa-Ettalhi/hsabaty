"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Wallet,
  PieChart,
  Bitcoin,
  Building2,
  Briefcase,
  LineChart,
} from "lucide-react"
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
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"
import { FluxCardEntrees, FluxCardSorties, FluxCardSolde } from "@/components/flux-kpi-cards"

const typeOptions = [
  { value: "actions", label: "Actions" },
  { value: "obligations", label: "Obligations" },
  { value: "fonds", label: "Fonds" },
  { value: "crypto", label: "Crypto" },
  { value: "immobilier", label: "Immobilier" },
  { value: "autre", label: "Autre" },
] as const

const inputClass =
  "h-11 rounded-xl border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50"
const labelClass = "text-sm font-semibold text-zinc-900 dark:text-zinc-200"

function InvestissementForm({
  form,
  onSubmit,
  onCancel,
  submitLabel,
  submitClassName,
}: {
  form: ReturnType<typeof useForm<FormValues>>
  onSubmit: (data: FormValues) => void
  onCancel: () => void
  submitLabel: string
  submitClassName?: string
}) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel className={labelClass}>Nom</FieldLabel>
          <Input
            placeholder="Ex. BTC wallet, SCPI Europe"
            className={inputClass}
            {...form.register("nom")}
          />
          <FieldError errors={[form.formState.errors.nom]} />
        </Field>
        <Field>
          <FieldLabel className={labelClass}>Type</FieldLabel>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {typeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel className={labelClass}>Montant investi (MAD)</FieldLabel>
          <Input
            type="number"
            min={1}
            step={1}
            placeholder="0"
            className={cn(inputClass, "font-semibold")}
            {...form.register("montantInvesti", { valueAsNumber: true })}
          />
          <FieldError errors={[form.formState.errors.montantInvesti]} />
        </Field>
        <Field>
          <FieldLabel className={cn(labelClass, "text-optional")}>
            Valeur actuelle
          </FieldLabel>
          <Input
            type="number"
            min={0}
            step={1}
            placeholder="Optionnel — pour le rendement"
            className={inputClass}
            {...form.register("valeurActuelle", { valueAsNumber: true })}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel className={labelClass}>Date d&apos;achat</FieldLabel>
        <Input type="date" className={inputClass} {...form.register("dateAchat")} />
      </Field>
      <Field>
        <FieldLabel className={cn(labelClass, "text-optional")}>Description</FieldLabel>
        <Input
          placeholder="Notes, broker, ISIN…"
          className={inputClass}
          {...form.register("description")}
        />
      </Field>
      <DialogFooter className="mt-2 pt-4">
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:w-auto"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className={cn(
            "h-11 w-full rounded-xl sm:w-auto",
            submitClassName ?? "bg-violet-600 hover:bg-violet-700"
          )}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}

const formSchema = z.object({
  nom: z.string().min(1, "Requis").max(100).trim(),
  type: z.enum(["actions", "obligations", "fonds", "crypto", "immobilier", "autre"]),
  montantInvesti: z.number().min(0.01, "> 0"),
  valeurActuelle: z.union([z.number().min(0), z.nan()]).optional(),
  dateAchat: z.string().min(1, "Requis"),
  description: z.string().max(500).trim().optional(),
})

type FormValues = z.infer<typeof formSchema>

type Investissement = {
  _id: string
  nom: string
  type: string
  montantInvesti: number
  valeurActuelle?: number
  rendementPourcentage?: number
  dateAchat: string
  dateValeur?: string
  description?: string
  actif: boolean
}

type Resume = {
  totalInvesti: number
  totalValeur: number
  rendementTotal: number
}

const formatter = new Intl.NumberFormat("fr-MA", {
  style: "currency",
  currency: "MAD",
  maximumFractionDigits: 0,
})

function typeIcon(type: string) {
  switch (type) {
    case "crypto":
      return Bitcoin
    case "immobilier":
      return Building2
    case "actions":
    case "obligations":
    case "fonds":
      return Briefcase
    default:
      return LineChart
  }
}

function charger(
  setList: (l: Investissement[]) => void,
  setResume: (r: Resume | null) => void,
  setLoading: (l: boolean) => void
) {
  setLoading(true)
  api
    .get<{ investissements: Investissement[]; resume: Resume }>("/api/investissements")
    .then((res) => {
      if (res.succes && res.donnees) {
        setList(res.donnees.investissements ?? [])
        setResume(res.donnees.resume ?? null)
      }
    })
    .finally(() => setLoading(false))
}

export function InvestmentsClient() {
  const [list, setList] = useState<Investissement[]>([])
  const [resume, setResume] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Investissement | null>(null)
  const [toDelete, setToDelete] = useState<Investissement | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom: "",
      type: "autre",
      montantInvesti: 0,
      dateAchat: new Date().toISOString().slice(0, 10),
      description: "",
    },
  })

  useEffect(() => {
    charger(setList, setResume, setLoading)
  }, [])

  function openCreate() {
    setEditing(null)
    form.reset({
      nom: "",
      type: "autre",
      montantInvesti: 0,
      valeurActuelle: undefined,
      dateAchat: new Date().toISOString().slice(0, 10),
      description: "",
    })
    setOpen(true)
  }

  function openEdit(i: Investissement) {
    setEditing(i)
    form.reset({
      nom: i.nom,
      type: i.type as FormValues["type"],
      montantInvesti: i.montantInvesti,
      valeurActuelle: i.valeurActuelle,
      dateAchat: i.dateAchat ? String(i.dateAchat).slice(0, 10) : "",
      description: i.description ?? "",
    })
  }

  async function onSubmit(data: FormValues) {
    const payload = {
      nom: data.nom,
      type: data.type,
      montantInvesti: data.montantInvesti,
      dateAchat: data.dateAchat,
      ...(data.valeurActuelle != null && !Number.isNaN(data.valeurActuelle)
        ? { valeurActuelle: data.valeurActuelle }
        : {}),
      ...(data.description ? { description: data.description } : {}),
    }
    if (editing) {
      const res = await api.put(`/api/investissements/${editing._id}`, payload)
      if (res.succes) {
        toast.success("Investissement mis à jour")
        setEditing(null)
        setOpen(false)
        charger(setList, setResume, setLoading)
      } else toast.error((res as { message?: string }).message ?? "Erreur")
    } else {
      const res = await api.post("/api/investissements", payload)
      if (res.succes) {
        toast.success("Investissement ajouté")
        setOpen(false)
        charger(setList, setResume, setLoading)
      } else toast.error((res as { message?: string }).message ?? "Erreur")
    }
  }

  async function handleDelete(i: Investissement) {
    const res = await api.delete(`/api/investissements/${i._id}`)
    if (res.succes) {
      toast.success("Supprimé")
      setToDelete(null)
      charger(setList, setResume, setLoading)
    } else toast.error((res as { message?: string }).message ?? "Erreur")
  }

  const gain = resume ? resume.totalValeur - resume.totalInvesti : 0
  const gainPct = resume?.rendementTotal ?? 0

  return (
    <DashboardPageShell contentClassName="gap-6">
      <DashboardPageHeader
        badge={{ icon: PieChart, label: "Portefeuille" }}
        title="Investissements"
        description="Suivez vos actifs : actions, crypto, immobilier, fonds — mettez à jour la valeur actuelle pour voir le rendement."
        actions={
        <Dialog
          open={open && !editing}
          onOpenChange={(o) => {
            setOpen(o)
            if (o) openCreate()
            else {
              form.reset({
                nom: "",
                type: "autre",
                montantInvesti: 0,
                valeurActuelle: undefined,
                dateAchat: new Date().toISOString().slice(0, 10),
                description: "",
              })
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-full bg-violet-600 px-5 shadow-md transition-shadow hover:bg-violet-700 hover:shadow-lg">
              <Plus className="size-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800/80 dark:bg-zinc-950">
            <DialogHeader className="mb-2 border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
              <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Nouvel investissement
              </DialogTitle>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Enregistrez un actif (actions, crypto, immobilier…) pour suivre la valeur et le rendement.
              </p>
            </DialogHeader>
            <InvestissementForm
              form={form}
              onSubmit={onSubmit}
              onCancel={() => setOpen(false)}
              submitLabel="Enregistrer"
              submitClassName="bg-violet-600 hover:bg-violet-700"
            />
          </DialogContent>
        </Dialog>
        }
      />

      {/* Modifier */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800/80 dark:bg-zinc-950">
          <DialogHeader className="mb-2 border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
            <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Modifier l&apos;investissement
            </DialogTitle>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Mettez à jour la valeur actuelle pour actualiser le rendement affiché.
            </p>
          </DialogHeader>
          <InvestissementForm
            form={form}
            onSubmit={onSubmit}
            onCancel={() => setEditing(null)}
            submitLabel="Mettre à jour"
            submitClassName="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl dark:border-zinc-800/80 dark:bg-zinc-950">
          {toDelete && (
            <div className="flex flex-col gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl text-rose-600">
                  Supprimer cet investissement ?
                </DialogTitle>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  La ligne sera retirée de votre portefeuille.{" "}
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Aucune transaction bancaire n&apos;est modifiée.
                  </strong>
                </p>
              </div>
              <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-500/5">
                <p className="flex items-center justify-between text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {toDelete.nom}
                  <span className="font-bold text-rose-600">
                    {formatter.format(toDelete.montantInvesti)}
                  </span>
                </p>
                <p className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
                  {toDelete.type}
                </p>
              </div>
              <DialogFooter className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full rounded-xl font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:w-auto"
                  onClick={() => setToDelete(null)}
                >
                  Conserver
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 w-full rounded-xl bg-rose-600 font-semibold shadow-sm hover:bg-rose-700 hover:shadow-md sm:w-auto"
                  onClick={() => handleDelete(toDelete)}
                >
                  Oui, supprimer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <FluxCardSorties
              title="Total investi"
              value={formatter.format(resume?.totalInvesti ?? 0)}
              subtitle="Coût d'entrée cumulé"
              icon={Wallet}
            />
            <FluxCardEntrees
              title="Valeur actuelle"
              value={formatter.format(resume?.totalValeur ?? 0)}
              subtitle="Estimation portefeuille"
              icon={TrendingUp}
            />
            <FluxCardSolde
              title="Rendement"
              value={`${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(2)} %`}
              subtitle={gain >= 0 ? `+${formatter.format(gain)}` : formatter.format(gain)}
              icon={PieChart}
              positive={gain >= 0}
            />
          </div>

          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed p-12 text-center">
              <PieChart className="mb-4 size-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Aucun investissement</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Ajoutez une ligne (actions, crypto, immobilier…) ou créez-en un via le chat avec
                l&apos;agent IA.
              </p>
              <Button
                className="mt-6 rounded-full"
                onClick={() => {
                  openCreate()
                  setOpen(true)
                }}
              >
                <Plus className="mr-2 size-4" />
                Premier investissement
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((i) => {
                const Icon = typeIcon(i.type)
                const val = i.valeurActuelle ?? i.montantInvesti
                const pct =
                  i.montantInvesti > 0
                    ? ((val - i.montantInvesti) / i.montantInvesti) * 100
                    : 0
                return (
                  <div
                    key={i._id}
                    className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600">
                        <Icon className="size-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{i.nom}</h3>
                        <p className="text-xs capitalize text-muted-foreground">{i.type}</p>
                        {i.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {i.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 sm:justify-end">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Investi</p>
                        <p className="font-medium tabular-nums">
                          {formatter.format(i.montantInvesti)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Valeur</p>
                        <p className="font-medium tabular-nums">{formatter.format(val)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Perf.</p>
                        <p
                          className={cn(
                            "font-semibold tabular-nums",
                            pct >= 0 ? "text-emerald-600" : "text-rose-600"
                          )}
                        >
                          {pct >= 0 ? "+" : ""}
                          {pct.toFixed(1)} %
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => openEdit(i)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="rounded-full text-rose-600"
                          onClick={() => setToDelete(i)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </DashboardPageShell>
  )
}
