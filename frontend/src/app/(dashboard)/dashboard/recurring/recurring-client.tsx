"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
        toast.success("Récurrente créée")
        form.reset({ description: "", montant: 0, type: "depense", categorie: "", frequence: "mensuel" })
        setOpen(false)
        load()
      } else toast.error(res.message ?? "Erreur")
    }
  }

  async function handleDelete(r: Recurrente) {
    const res = await api.delete(`/api/transactions-recurrentes/${r._id}`)
    if (res.succes) {
      toast.success("Récurrente supprimée")
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
      toast.success(n ? `${n} transaction(s) générée(s)` : "Aucune transaction à générer")
      load()
    } else toast.error(res.message ?? "Erreur")
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">Transactions récurrentes</CardTitle>
            <CardDescription>Abonnements et dépenses récurrentes</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerer} disabled={generating}>
              <RefreshCw className={`size-4 mr-1.5 ${generating ? "animate-spin" : ""}`} />
              Générer
            </Button>
            <Dialog open={open && !editing} onOpenChange={(o) => { setOpen(o); if (!o) form.reset({ description: "", montant: 0, type: "depense", categorie: "", frequence: "mensuel" }) }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" onClick={() => setEditing(null)}>
                  <Plus className="size-4" />
                  Créer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm p-0 gap-0">
                <DialogHeader className="p-4 pb-2">
                  <DialogTitle>Nouvelle transaction récurrente</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-4 pb-4">
                  <Field>
                    <FieldLabel className="text-xs">Description</FieldLabel>
                    <Input placeholder="Ex. Abonnement" className="h-8 text-sm" {...form.register("description")} />
                    <FieldError errors={[form.formState.errors.description]} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel className="text-xs">Montant (MAD)</FieldLabel>
                      <Input type="number" min={0.01} step={0.01} className="h-8 text-sm" {...form.register("montant", { valueAsNumber: true })} />
                      <FieldError errors={[form.formState.errors.montant]} />
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs">Fréquence</FieldLabel>
                      <Controller control={form.control} name="frequence" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {frequenceOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel className="text-xs">Type</FieldLabel>
                      <Controller control={form.control} name="type" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="depense">Dépense</SelectItem>
                            <SelectItem value="revenu">Revenu</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs">Catégorie</FieldLabel>
                      <Input placeholder="Ex. Abonnements" className="h-8 text-sm" {...form.register("categorie")} />
                      <FieldError errors={[form.formState.errors.categorie]} />
                    </Field>
                  </div>
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
                  <DialogTitle>Modifier la récurrente</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-4 pb-4">
                  <Field>
                    <FieldLabel className="text-xs">Description</FieldLabel>
                    <Input className="h-8 text-sm" {...form.register("description")} />
                    <FieldError errors={[form.formState.errors.description]} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel className="text-xs">Montant (MAD)</FieldLabel>
                      <Input type="number" min={0.01} step={0.01} className="h-8 text-sm" {...form.register("montant", { valueAsNumber: true })} />
                      <FieldError errors={[form.formState.errors.montant]} />
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs">Fréquence</FieldLabel>
                      <Controller control={form.control} name="frequence" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {frequenceOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel className="text-xs">Type</FieldLabel>
                      <Controller control={form.control} name="type" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="depense">Dépense</SelectItem>
                            <SelectItem value="revenu">Revenu</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </Field>
                    <Field>
                      <FieldLabel className="text-xs">Catégorie</FieldLabel>
                      <Input className="h-8 text-sm" {...form.register("categorie")} />
                      <FieldError errors={[form.formState.errors.categorie]} />
                    </Field>
                  </div>
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
                  <DialogTitle>Supprimer cette récurrente ?</DialogTitle>
                </DialogHeader>
                {toDelete && (
                  <>
                    <p className="text-muted-foreground text-sm">{toDelete.description} · {toDelete.montant} MAD ({toDelete.frequence}).</p>
                    <DialogFooter>
                      <Button variant="outline" size="sm" onClick={() => setToDelete(null)}>Annuler</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(toDelete)}>Supprimer</Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <Skeleton className="h-[220px] w-full rounded-lg" />
          ) : data?.transactionsRecurrentes?.length ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                <span className="text-sm font-medium">Total mensuel (équivalent)</span>
                <span className="tabular-nums font-semibold">{data.totalMensuel?.toFixed(0) ?? 0} MAD</span>
              </div>
              <ul className="space-y-3">
                {data.transactionsRecurrentes.map((t) => (
                  <li key={t._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.description}</p>
                      <p className="text-muted-foreground text-sm">
                        {t.montant} MAD · {frequenceOptions.find((f) => f.value === t.frequence)?.label ?? t.frequence} · Prochaine échéance {new Date(t.prochaineDate).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.type === "depense" ? "secondary" : "outline"}>{t.type === "depense" ? "Dépense" : "Revenu"}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(t)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/10 text-center">
              <p className="text-muted-foreground text-sm">Aucune transaction récurrente.</p>
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Créer une récurrente</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
