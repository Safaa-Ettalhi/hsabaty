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

export function BudgetClient() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    chargerBudgets(setBudgets, setLoading)
  }, [])

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

  async function onSubmit(data: BudgetFormValues) {
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
    } else {
      toast.error(res.message ?? "Erreur")
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Budgets</CardTitle>
            <CardDescription>Suivi des budgets par catégorie</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
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
                    <Input
                      placeholder="Ex. Alimentation"
                      className="h-8 text-sm"
                      {...form.register("nom")}
                    />
                    <FieldError errors={[form.formState.errors.nom]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs">Période</FieldLabel>
                    <Controller
                      control={form.control}
                      name="periode"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {periodeOptions.map((opt) => (
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
                <Field>
                  <FieldLabel className="text-xs">Montant (MAD)</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="5000"
                    className="h-8 text-sm"
                    {...form.register("montant", { valueAsNumber: true })}
                  />
                  <FieldError errors={[form.formState.errors.montant]} />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Catégorie (opt.)</FieldLabel>
                  <Input
                    placeholder="Ex. Courses, Transport"
                    className="h-8 text-sm"
                    {...form.register("categorie")}
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
          ) : budgets.length ? (
            <ul className="space-y-4">
              {budgets.map((b) => (
                <li
                  key={b._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{b.nom}</p>
                    <p className="text-muted-foreground text-sm">
                      {b.categorie || "—"} · {b.periode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">
                      {b.statistiques?.montantUtilise?.toFixed(0) ?? 0} / {b.montant} MAD
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Reste: {b.statistiques?.montantRestant?.toFixed(0) ?? b.montant} MAD
                    </p>
                    <Badge
                      variant={b.statistiques?.statut === "depasse" ? "destructive" : "outline"}
                      className="mt-1"
                    >
                      {b.statistiques?.pourcentageUtilise?.toFixed(1) ?? 0} %
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="bg-muted/50 flex h-[200px] flex-col items-center justify-center gap-3 rounded-lg text-muted-foreground text-sm">
              <p>Aucun budget.</p>
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                Créer un budget
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
