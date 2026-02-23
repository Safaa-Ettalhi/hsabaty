"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Download, FileSpreadsheet } from "lucide-react"
import { api, downloadFile } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const transactionFormSchema = z.object({
  date: z.string().min(1, "Requis"),
  montant: z.number().positive("Montant > 0").finite(),
  type: z.enum(["revenu", "depense"]),
  categorie: z.string().min(1, "Requis").max(100).trim(),
  description: z.string().min(1, "Requis").max(500).trim(),
  tagsStr: z.string().max(300).optional(),
})

type TransactionFormValues = z.infer<typeof transactionFormSchema>

type Transaction = {
  _id: string
  date: string
  description: string
  categorie: string
  montant: number
  type: string
  tags?: string[]
}

type Res = {
  transactions: Transaction[]
  pagination: { page: number; limite: number; total: number; pages: number }
}

export function TransactionsClient() {
  const [data, setData] = useState<Res | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [type, setType] = useState<string>("")
  const [categorie, setCategorie] = useState("")
  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")
  const [recherche, setRecherche] = useState("")
  const [sort, setSort] = useState("date")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [openForm, setOpenForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)

  const query = new URLSearchParams()
  query.set("page", String(page))
  query.set("limite", "20")
  if (type) query.set("type", type)
  if (categorie) query.set("categorie", categorie)
  if (dateDebut) query.set("dateDebut", dateDebut)
  if (dateFin) query.set("dateFin", dateFin)
  if (recherche) query.set("recherche", recherche)
  query.set("sort", sort)
  query.set("order", order)

  useEffect(() => {
    setLoading(true)
    api
      .get<Res>(`/api/transactions?${query}`)
      .then((res) => {
        if (res.succes && res.donnees) setData(res.donnees)
      })
      .finally(() => setLoading(false))
  }, [page, type, categorie, dateDebut, dateFin, recherche, sort, order])

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      montant: 0,
      type: "depense",
      categorie: "",
      description: "",
      tagsStr: "",
    },
  })

  function refetch() {
    setLoading(true)
    api.get<Res>(`/api/transactions?${query}`).then((res) => {
      if (res.succes && res.donnees) setData(res.donnees)
    }).finally(() => setLoading(false))
  }

  function parseTags(s: string | undefined): string[] {
    if (!s?.trim()) return []
    return s.split(/[\s,]+/).map((t) => t.trim()).filter(Boolean).slice(0, 10)
  }

  async function onSubmit(dataForm: TransactionFormValues) {
    const tags = parseTags(dataForm.tagsStr)
    if (editingId) {
      const res = await api.put<{ transaction: Transaction }>(`/api/transactions/${editingId}`, {
        date: dataForm.date,
        montant: dataForm.montant,
        type: dataForm.type,
        categorie: dataForm.categorie,
        description: dataForm.description,
        ...(tags.length ? { tags } : {}),
      })
      if (res.succes) {
        toast.success("Transaction modifiée")
        setOpenForm(false)
        setEditingId(null)
        form.reset()
        refetch()
      } else toast.error(res.message ?? "Erreur")
    } else {
      const res = await api.post<{ transaction: Transaction }>("/api/transactions", {
        date: dataForm.date,
        montant: dataForm.montant,
        type: dataForm.type,
        categorie: dataForm.categorie,
        description: dataForm.description,
        ...(tags.length ? { tags } : {}),
      })
      if (res.succes) {
        toast.success("Transaction créée")
        setOpenForm(false)
        form.reset({ date: new Date().toISOString().slice(0, 10), montant: 0, type: "depense", categorie: "", description: "", tagsStr: "" })
        refetch()
      } else toast.error(res.message ?? "Erreur")
    }
  }

  async function handleDelete(id: string) {
    const res = await api.delete(`/api/transactions/${id}`)
    if (res.succes) {
      toast.success("Transaction supprimée")
      setTransactionToDelete(null)
      refetch()
    } else toast.error(res.message ?? "Erreur")
  }

  function openEdit(t: Transaction) {
    setEditingId(t._id)
    form.reset({
      date: t.date.slice(0, 10),
      montant: t.montant,
      type: t.type as "revenu" | "depense",
      categorie: t.categorie,
      description: t.description,
      tagsStr: t.tags?.length ? t.tags.join(", ") : "",
    })
    setOpenForm(true)
  }

  function openAdd() {
    setEditingId(null)
    form.reset({
      date: new Date().toISOString().slice(0, 10),
      montant: 0,
      type: "depense",
      categorie: "",
      description: "",
    })
    setOpenForm(true)
  }

  const exportQuery = new URLSearchParams()
  if (type) exportQuery.set("type", type)
  if (categorie) exportQuery.set("categorie", categorie)
  if (dateDebut) exportQuery.set("dateDebut", dateDebut)
  if (dateFin) exportQuery.set("dateFin", dateFin)
  const exportPath = (fmt: "csv" | "excel") =>
    `/api/transactions/export/${fmt}${exportQuery.toString() ? `?${exportQuery}` : ""}`

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Liste avec filtres, tri et export</CardDescription>
          </div>
          <Dialog open={openForm} onOpenChange={(o) => { setOpenForm(o); if (!o) setEditingId(null) }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" onClick={openAdd}>
                <Plus className="size-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm p-0 gap-0">
              <DialogHeader className="p-4 pb-2">
                <DialogTitle>{editingId ? "Modifier la transaction" : "Nouvelle transaction"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel className="text-xs">Date</FieldLabel>
                    <Input type="date" className="h-8 text-sm" {...form.register("date")} />
                    <FieldError errors={[form.formState.errors.date]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-xs">Montant (MAD)</FieldLabel>
                    <Input type="number" min={0.01} step={0.01} className="h-8 text-sm" {...form.register("montant", { valueAsNumber: true })} />
                    <FieldError errors={[form.formState.errors.montant]} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel className="text-xs">Type</FieldLabel>
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="depense">Dépense</SelectItem>
                          <SelectItem value="revenu">Revenu</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Catégorie</FieldLabel>
                  <Input placeholder="Ex. Alimentation" className="h-8 text-sm" {...form.register("categorie")} />
                  <FieldError errors={[form.formState.errors.categorie]} />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Description</FieldLabel>
                  <Input placeholder="Description" className="h-8 text-sm" {...form.register("description")} />
                  <FieldError errors={[form.formState.errors.description]} />
                </Field>
                <Field>
                  <FieldLabel className="text-xs">Tags (optionnel)</FieldLabel>
                  <Input placeholder="Ex. travail, remboursement" className="h-8 text-sm" {...form.register("tagsStr")} />
                </Field>
                <DialogFooter className="p-0 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpenForm(false)}>Annuler</Button>
                  <Button type="submit" size="sm">{editingId ? "Enregistrer" : "Créer"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
              <SelectTrigger className="h-8 w-[120px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="revenu">Revenu</SelectItem>
                <SelectItem value="depense">Dépense</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Catégorie"
              className="h-8 w-[120px] text-sm"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
            />
            <Input type="date" className="h-8 w-[140px] text-sm" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} placeholder="Début" />
            <Input type="date" className="h-8 w-[140px] text-sm" value={dateFin} onChange={(e) => setDateFin(e.target.value)} placeholder="Fin" />
            <Input
              placeholder="Recherche"
              className="h-8 w-[140px] text-sm"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="montant">Montant</SelectItem>
                <SelectItem value="categorie">Catégorie</SelectItem>
                <SelectItem value="description">Description</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}>
              {order === "asc" ? "↑ Asc" : "↓ Desc"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => downloadFile(exportPath("csv"), `transactions_${Date.now()}.csv`).catch(() => toast.error("Erreur export CSV"))}
            >
              <Download className="size-3" /> CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => downloadFile(exportPath("excel"), `transactions_${Date.now()}.xlsx`).catch(() => toast.error("Erreur export Excel"))}
            >
              <FileSpreadsheet className="size-3" /> Excel
            </Button>
          </div>
          {loading ? (
            <Skeleton className="h-[300px] w-full rounded-lg" />
          ) : data?.transactions?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Tags</TableHead>
                    <TableHead className="w-[90px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.map((t) => (
                    <TableRow key={t._id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(t.date).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell>{t.categorie}</TableCell>
                      <TableCell className={`text-right tabular-nums ${t.type === "depense" ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
                        {t.type === "depense" ? "-" : "+"}
                        {t.montant.toFixed(2)} MAD
                      </TableCell>
                      <TableCell>{t.type === "depense" ? "Dépense" : "Revenu"}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {t.tags?.length ? t.tags.slice(0, 3).join(", ") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTransactionToDelete(t)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Page {data.pagination.page} / {data.pagination.pages} ({data.pagination.total} au total)</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
                  <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
                </div>
              </div>
              <Dialog open={!!transactionToDelete} onOpenChange={(o) => !o && setTransactionToDelete(null)}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Supprimer la transaction ?</DialogTitle>
                  </DialogHeader>
                  {transactionToDelete && (
                    <>
                      <p className="text-muted-foreground text-sm">
                        {transactionToDelete.description} – {transactionToDelete.montant.toFixed(2)} MAD. Cette action est irréversible.
                      </p>
                      <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setTransactionToDelete(null)}>Annuler</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(transactionToDelete._id)}>Supprimer</Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <div className="bg-muted/50 flex h-[200px] items-center justify-center rounded-lg text-muted-foreground text-sm">
              Aucune transaction
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
