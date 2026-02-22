"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus } from "lucide-react"
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

  async function onSubmit(data: ObjectifFormValues) {
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
    } else {
      toast.error(res.message ?? "Erreur")
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Objectifs</CardTitle>
            <CardDescription>Objectifs d'épargne et suivi de progression</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : objectifs.length ? (
            <ul className="space-y-4">
              {objectifs.map((o) => (
                <li
                  key={o._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{o.nom}</p>
                    <p className="text-muted-foreground text-sm">
                      {typeObjectifOptions.find((t) => t.value === o.type)?.label ?? o.type} · limite{" "}
                      {new Date(o.dateLimite).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">
                      {o.montantActuel} / {o.montantCible} MAD
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Reste:{" "}
                      {o.progression?.montantRestant?.toFixed(0) ??
                        (o.montantCible - o.montantActuel)} MAD
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {o.progression?.pourcentageComplete?.toFixed(1) ?? 0} %
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-muted/50 flex h-[200px] flex-col items-center justify-center gap-3 rounded-lg text-muted-foreground text-sm">
              <p>Aucun objectif.</p>
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                Créer un objectif
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
