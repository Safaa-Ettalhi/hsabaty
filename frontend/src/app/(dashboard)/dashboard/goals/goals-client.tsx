"use client"

import { useEffect, useState } from "react"
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

const typeObjectifOptions = [
  { value: "epargne", label: "Épargne" },
  { value: "remboursement", label: "Remboursement" },
  { value: "fonds_urgence", label: "Fonds d'urgence" },
  { value: "projet", label: "Projet" },
] as const

const objectifFormSchema = z.object({
  nom: z.string().min(1, "Requis").max(100).trim(),
  montantCible: z.number().positive("Montant > 0").finite(),
  dateLimite: z.string().min(1, "Requis"),
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

function chargerObjectifs(setObjectifs: (o: Objectif[]) => void, setLoading: (l: boolean) => void) {
  setLoading(true)
  api
    .get<{ objectifs: Objectif[] }>("/api/objectifs")
    .then((res) => {
      if (res.succes && res.donnees?.objectifs) setObjectifs(res.donnees.objectifs)
    })
    .finally(() => setLoading(false))
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
      toast.success("Contribution ajoutée")
      setContributionObjectif(null)
      setContributionMontant("")
      chargerObjectifs(setObjectifs, setLoading)
    } else toast.error(res.message ?? "Erreur")
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
        toast.success("Objectif modifié")
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Objectifs</CardTitle>
            <CardDescription>Objectifs d'épargne et suivi de progression</CardDescription>
          </div>
          <Dialog open={open && !editing} onOpenChange={(o) => { setOpen(o); if (!o) form.reset({ nom: "", montantCible: 0, dateLimite: "", type: "epargne", description: "" }) }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={() => setEditing(null)}>
                <Plus className="size-4" />
                Créer un objectif
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm p-0 gap-0">
              <DialogHeader className="p-4 pb-2">
                <DialogTitle>Nouvel objectif</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel className="text-xs">Nom</FieldLabel>
                    <Input
                      placeholder="Ex. Vacances"
                      className="h-8 text-sm"
                      {...form.register("nom")}
                    />
                    <FieldError errors={[form.formState.errors.nom]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs">Type</FieldLabel>
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {typeObjectifOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel className="text-xs">Montant (MAD)</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      placeholder="50000"
                      className="h-8 text-sm"
                      {...form.register("montantCible", { valueAsNumber: true })}
                    />
                    <FieldError errors={[form.formState.errors.montantCible]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs">Date limite</FieldLabel>
                    <Input type="date" className="h-8 text-sm" {...form.register("dateLimite")} />
                    <FieldError errors={[form.formState.errors.dateLimite]} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel className="text-xs">Description (opt.)</FieldLabel>
                  <Input
                    placeholder="Notes"
                    className="h-8 text-sm"
                    {...form.register("description")}
                  />
                </Field>
                <DialogFooter className="p-0 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm">
                    Créer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
            <DialogContent className="max-w-sm p-0 gap-0">
              <DialogHeader className="p-4 pb-2">
                <DialogTitle>Modifier l&apos;objectif</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel className="text-xs">Nom</FieldLabel>
                    <Input className="h-8 text-sm" {...form.register("nom")} />
                    <FieldError errors={[form.formState.errors.nom]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs">Type</FieldLabel>
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {typeObjectifOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel className="text-xs">Montant (MAD)</FieldLabel>
                    <Input type="number" min={1} step={1} className="h-8 text-sm" {...form.register("montantCible", { valueAsNumber: true })} />
                    <FieldError errors={[form.formState.errors.montantCible]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs">Date limite</FieldLabel>
                    <Input type="date" className="h-8 text-sm" {...form.register("dateLimite")} />
                    <FieldError errors={[form.formState.errors.dateLimite]} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel className="text-xs">Description (opt.)</FieldLabel>
                  <Input className="h-8 text-sm" {...form.register("description")} />
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
                <DialogTitle>Supprimer cet objectif ?</DialogTitle>
              </DialogHeader>
              {toDelete && (
                <>
                  <p className="text-muted-foreground text-sm">
                    {toDelete.nom} · {toDelete.montantActuel} / {toDelete.montantCible} MAD. Les contributions enregistrées seront perdues.
                  </p>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setToDelete(null)}>Annuler</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(toDelete)}>Supprimer</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : objectifs.length ? (
            <ul className="space-y-4">
              {objectifs.map((o) => (
                <li
                  key={o._id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{o.nom}</p>
                    <p className="text-muted-foreground text-sm">
                      {typeObjectifOptions.find((t) => t.value === o.type)?.label ?? o.type} · limite{" "}
                      {new Date(o.dateLimite).toLocaleDateString("fr-FR")}
                    </p>
                    <p className="mt-1.5 text-sm tabular-nums">
                      {o.montantActuel} / {o.montantCible} MAD
                      <span className="text-muted-foreground"> · Reste {o.progression?.montantRestant?.toFixed(0) ?? (o.montantCible - o.montantActuel)} MAD</span>
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {o.progression?.pourcentageComplete?.toFixed(1) ?? 0} %
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setContributionObjectif(o); setContributionMontant("") }}
                    >
                      Contribuer
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(o)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(o)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/10 text-center text-muted-foreground text-sm">
              <p>Aucun objectif.</p>
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                Créer un objectif
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!contributionObjectif} onOpenChange={(o) => !o && setContributionObjectif(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter une contribution</DialogTitle>
            {contributionObjectif && (
              <p className="text-muted-foreground text-sm">
                {contributionObjectif.nom} · reste {((contributionObjectif.progression?.montantRestant) ?? (contributionObjectif.montantCible - contributionObjectif.montantActuel)).toFixed(0)} MAD
              </p>
            )}
          </DialogHeader>
          {contributionObjectif && (
            <>
              <Field>
                <FieldLabel className="text-xs">Montant (MAD)</FieldLabel>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  placeholder="0"
                  value={contributionMontant}
                  onChange={(e) => setContributionMontant(e.target.value)}
                />
              </Field>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setContributionObjectif(null)}>Annuler</Button>
                <Button size="sm" onClick={onContribution} disabled={contributing || !contributionMontant || Number(contributionMontant) <= 0}>
                  Ajouter
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
