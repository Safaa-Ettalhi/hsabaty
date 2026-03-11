/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Download, FileSpreadsheet, Search, ArrowUpRight, ArrowDownRight, Tag, CalendarDays, ArrowUpCircle, ArrowDownCircle, DatabaseZap} from "lucide-react"
import { api, downloadFile } from "@/lib/api"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
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

const transactionFormSchema = z.object({
  date: z.string().min(1, "Requis"),
  montant: z.number().positive("Montant > 0").finite(),
  type: z.enum(["revenu", "depense"]),
  categorie: z.string().min(1, "Requis").max(100).trim(),
  sousCategorie: z.string().max(100).trim().optional(),
  description: z.string().min(1, "Requis").max(500).trim(),
  tagsStr: z.string().max(300).optional(),
})

type TransactionFormValues = z.infer<typeof transactionFormSchema>

type Transaction = {
  _id: string
  date: string
  description: string
  categorie: string
  sousCategorie?: string
  montant: number
  type: string
  tags?: string[]
}

type Res = {
  transactions: Transaction[]
  pagination: { page: number; limite: number; total: number; pages: number }
}

const formatter = new Intl.NumberFormat("fr-MA", { style: 'currency', currency: 'MAD', maximumFractionDigits: 2 });

export function TransactionsClient() {
  const [data, setData] = useState<Res | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [type, setType] = useState<string>("all")
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
  query.set("limite", "15") 
  if (type && type !== "all") query.set("type", type)
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
      sousCategorie: "",
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
        sousCategorie: dataForm.sousCategorie ?? "",
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
        ...(dataForm.sousCategorie ? { sousCategorie: dataForm.sousCategorie } : {}),
        description: dataForm.description,
        ...(tags.length ? { tags } : {}),
      })
      if (res.succes) {
        toast.success("Transaction créée avec succès")
        setOpenForm(false)
        form.reset({
          date: new Date().toISOString().slice(0, 10),
          montant: 0,
          type: "depense",
          categorie: "",
          sousCategorie: "",
          description: "",
          tagsStr: "",
        })
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
      sousCategorie: (t as any).sousCategorie ?? "",
      description: t.description,
      tagsStr: t.tags?.length ? t.tags.join(", ") : "",
    })
    setOpenForm(true)
  }

  const exportQuery = new URLSearchParams()
  if (type && type !== "all") exportQuery.set("type", type)
  if (categorie) exportQuery.set("categorie", categorie)
  if (dateDebut) exportQuery.set("dateDebut", dateDebut)
  if (dateFin) exportQuery.set("dateFin", dateFin)
  const exportPath = (fmt: "csv" | "excel") =>
    `/api/transactions/export/${fmt}${exportQuery.toString() ? '?' + exportQuery : ""}`
  const totalRevenus = data?.transactions?.filter(t => t.type === 'revenu').reduce((acc, t) => acc + t.montant, 0) || 0;
  const totalDepenses = data?.transactions?.filter(t => t.type === 'depense').reduce((acc, t) => acc + t.montant, 0) || 0;
  const balance = totalRevenus - totalDepenses;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8 md:pt-6 bg-zinc-50/50 dark:bg-zinc-950/20 min-h-full">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Opérations</h1>
          <p className="text-zinc-500 mt-1 block">Pilotez vos flux d&apos;argent au centime près.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden lg:flex gap-1.5 shadow-sm bg-white dark:bg-zinc-900 h-9" onClick={() => downloadFile(exportPath("csv"), `transactions_${Date.now()}.csv`)}>
            <Download className="size-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="hidden lg:flex gap-1.5 shadow-sm bg-white dark:bg-zinc-900 h-9" onClick={() => downloadFile(exportPath("excel"), `transactions_${Date.now()}.xlsx`)}>
            <FileSpreadsheet className="size-4" /> Export Excel
          </Button>

          <Dialog open={openForm} onOpenChange={(o) => { setOpenForm(o); if (!o) setEditingId(null) }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-md hover:shadow-lg transition-shadow bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 h-10">
                <Plus className="size-4" />
                Saisir un mouvement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-106.25 p-6 rounded-2xl border-zinc-200 dark:border-zinc-800">
              <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                <DialogTitle className="text-xl">
                  {editingId ? "Modifier la transaction" : "Nouvelle transaction"}
                </DialogTitle>
                <p className="text-sm text-zinc-500 mt-1">
                  Enregistrez rapidement vos dépenses ou revenus.
                </p>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="text-sm font-medium">Date</FieldLabel>
                    <Input type="date" className="h-10 rounded-xl" {...form.register("date")} />
                    <FieldError errors={[form.formState.errors.date]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm font-medium">Montant</FieldLabel>
                    <Input type="number" min={0.01} step={0.01} className="h-10 rounded-xl" {...form.register("montant", { valueAsNumber: true })} />
                    <FieldError errors={[form.formState.errors.montant]} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="text-sm font-medium">Type</FieldLabel>
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className={cn("h-10 rounded-xl font-medium", field.value === 'depense' ? 'text-rose-600' : 'text-emerald-600')}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="depense">Dépense (-)</SelectItem>
                            <SelectItem value="revenu">Revenu (+)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm font-medium">Catégorie</FieldLabel>
                    <Input placeholder="Ex. Loisirs" className="h-10 rounded-xl" {...form.register("categorie")} />
                    <FieldError errors={[form.formState.errors.categorie]} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="text-sm font-medium">Description</FieldLabel>
                    <Input placeholder="Qu'avez-vous acheté ?" className="h-10 rounded-xl" {...form.register("description")} />
                    <FieldError errors={[form.formState.errors.description]} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm font-medium">Sous-catégorie</FieldLabel>
                    <Input placeholder="Ex. Train, Frais..." className="h-10 rounded-xl" {...form.register("sousCategorie")} />
                    <FieldError errors={[form.formState.errors.sousCategorie]} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel className="text-sm font-medium">Tags (optionnels)</FieldLabel>
                  <Input placeholder="Ex. voyage pro avion (séparés par espace)" className="h-10 rounded-xl" {...form.register("tagsStr")} />
                  <FieldError errors={[form.formState.errors.tagsStr]} />
                </Field>
                <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                  <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto" onClick={() => setOpenForm(false)}>Annuler</Button>
                  <Button type="submit" className="rounded-xl w-full sm:w-auto bg-blue-600 hover:bg-blue-700">{editingId ? "Sauvegarder" : "Valider"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm">
           <div className="absolute top-0 right-0 p-4 opacity-5">
             <ArrowUpCircle className="size-24" />
           </div>
           <p className="text-sm font-medium text-zinc-500 mb-1">Entrées (sur cette page)</p>
           <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{formatter.format(totalRevenus)}</h3>
           <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
             <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Argent crédité
           </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 shadow-sm">
           <div className="absolute top-0 right-0 p-4 opacity-5">
             <ArrowDownCircle className="size-24" />
           </div>
           <p className="text-sm font-medium text-zinc-500 mb-1">Sorties (sur cette page)</p>
           <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">-{formatter.format(totalDepenses)}</h3>
           <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
             <span className="w-2 h-2 rounded-full bg-rose-500"></span> Argent débité
           </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-950 p-5 shadow-sm text-white">
           <p className="text-sm font-medium text-zinc-300 mb-1">Bilan Partiel</p>
           <h3 className="text-2xl font-bold">{balance > 0 ? '+' : ''}{formatter.format(balance)}</h3>
           <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
             <span className={cn("w-2 h-2 rounded-full", balance >= 0 ? "bg-emerald-400" : "bg-rose-400")}></span> 
             {balance >= 0 ? "Bilan positif" : "Bilan négatif"}
           </div>
        </div>
      </div>

      {/* FILTERS & LIST */}
      <div className="flex flex-col rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 shadow-sm ">
        
        {/* PREMIUM FILTER BAR */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
           <div className="flex flex-col lg:flex-row items-center gap-3">
             <div className="relative flex-1 w-full lg:max-w-md group">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
               <Input 
                 placeholder="Rechercher par description..." 
                 className="pl-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500/20"
                 value={recherche}
                 onChange={(e) => setRecherche(e.target.value)}
               />
             </div>
             <div className="flex pb-2 lg:pb-0 overflow-x-auto w-full lg:w-auto gap-2 items-center">
                <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-10 w-32.5 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    <SelectValue placeholder="Tous les flux" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">Tous les flux</SelectItem>
                    <SelectItem value="revenu" className="text-emerald-600">Revenus seuls</SelectItem>
                    <SelectItem value="depense" className="text-rose-600">Dépenses seules</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  placeholder="Catégorie"
                  className="h-10 w-35 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                />
                
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-1">
                  <Input type="date" className="h-8 border-none shadow-none text-xs w-30 focus-visible:ring-0" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} title="Date début" />
                  <span className="text-zinc-300">-</span>
                  <Input type="date" className="h-8 border-none shadow-none text-xs w-30 focus-visible:ring-0" value={dateFin} onChange={(e) => setDateFin(e.target.value)} title="Date fin" />
                </div>

                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-10 w-30 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="date">Tri par date</SelectItem>
                    <SelectItem value="montant">Tri par montant</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-xl bg-white dark:bg-zinc-900" onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}>
                  {order === "asc" ? "↑" : "↓"}
                </Button>
             </div>
           </div>
        </div>

        {/* MODERN LISTING */}
        <div className="flex flex-col">
           {loading ? (
             <div className="p-8 space-y-4">
               {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
             </div>
           ) : data?.transactions?.length ? (
             <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {data.transactions.map((t) => (
                  <div key={t._id} className="group p-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                    
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center shrink-0 shadow-sm border",
                        t.type === 'depense' 
                          ? "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400" 
                          : "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                      )}>
                        {t.type === 'depense' ? <ArrowDownRight className="size-5" /> : <ArrowUpRight className="size-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 text-base">{t.description}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-zinc-500">
                          <span className="flex items-center gap-1.5 whitespace-nowrap"><CalendarDays className="size-3.5"/> {new Date(t.date).toLocaleDateString("fr-FR", {day: "numeric", month: "long", year: "numeric"})}</span>
                          <span className="flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-600 dark:text-zinc-300">
                            <Tag className="size-3"/> 
                            {t.categorie}
                            {t.sousCategorie && <span className="text-zinc-400 dark:text-zinc-500 font-normal ml-0.5">/ {t.sousCategorie}</span>}
                          </span>
                          {t.tags && t.tags.length > 0 && (
                            <span className="hidden md:inline-flex items-center gap-1 text-zinc-400">
                              {t.tags.slice(0, 2).map((tag, idx) => (
                                <span key={idx}>#{tag}</span>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:pl-0 pl-16">
                      <div className="text-left sm:text-right">
                        <span className={cn(
                          "font-bold text-lg tabular-nums tracking-tight whitespace-nowrap",
                          t.type === 'depense' ? "text-zinc-900 dark:text-zinc-100" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {t.type === 'revenu' ? '+' : ''}{formatter.format(t.montant)}
                        </span>
                        <p className="text-xs text-zinc-400 capitalize mt-0.5 hidden sm:block">{t.type}</p>
                      </div>

                      <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-9 w-9 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full" onClick={() => openEdit(t)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 rounded-full" onClick={() => setTransactionToDelete(t)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                  </div>
                ))}
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center p-16 text-center h-100">
               <div className="size-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-5 border border-zinc-200 dark:border-zinc-700">
                 <DatabaseZap className="size-8 text-zinc-400" />
               </div>
               <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Aucune donnée trouvée</h3>
               <p className="text-zinc-500 max-w-sm mx-auto text-sm leading-relaxed">
                 Nous n&apos;avons trouvé aucune transaction correspondant à vos critères actuels. Essayez d&apos;ajuster vos filtres.
               </p>
               <Button variant="outline" className="mt-6 rounded-xl" onClick={() => { setType("all"); setCategorie(""); setRecherche(""); setDateDebut(""); setDateFin(""); }}>
                 Réinitialiser les filtres
               </Button>
             </div>
           )}
        </div>

        {/* PAGINATION FOOTER */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-zinc-500 font-medium">
              Aperçu détaillé — <strong className="text-zinc-900 dark:text-zinc-100">{data.transactions.length}</strong> résultats affichés
            </span>
            <div className="flex gap-2 bg-white dark:bg-zinc-800 p-1 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700">
              <Button variant="ghost" size="sm" className="h-8 rounded-lg" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </Button>
              <div className="flex items-center justify-center px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                 {data.pagination.page} / {data.pagination.pages}
              </div>
              <Button variant="ghost" size="sm" className="h-8 rounded-lg" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!transactionToDelete} onOpenChange={(o) => !o && setTransactionToDelete(null)}>
        <DialogContent className="sm:max-w-md p-6 rounded-2xl">
          {transactionToDelete && (
             <div className="flex flex-col gap-4">
               <div>
                  <DialogTitle className="text-xl text-rose-600 flex items-center gap-2">
                    Confirmation de suppression
                  </DialogTitle>
                  <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                    Vous êtes sur le point d&apos;effacer cette opération. <strong>Cette action est irréversible</strong> et mettra à jour tous vos budgets.
                  </p>
               </div>
               
               <div className="rounded-xl border border-rose-100 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-500/5 p-4 flex flex-col gap-2 mt-2">
                 <p className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between text-base">
                   {transactionToDelete.description}
                   <span className={cn("font-bold", transactionToDelete.type === "depense" ? "text-rose-600" : "text-emerald-600")}>
                     {transactionToDelete.type === "depense" ? "-" : "+"}{formatter.format(transactionToDelete.montant)}
                   </span>
                 </p>
                 <div className="flex items-center gap-2 text-xs text-zinc-500">
                   <span className="bg-white dark:bg-zinc-800 px-2 py-1 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700">{new Date(transactionToDelete.date).toLocaleDateString("fr-FR")}</span>
                   <span className="bg-white dark:bg-zinc-800 px-2 py-1 rounded-md shadow-sm border border-zinc-200 dark:border-zinc-700">{transactionToDelete.categorie}</span>
                 </div>
               </div>

               <DialogFooter className="mt-4 flex gap-2">
                 <Button type="button" variant="ghost" className="rounded-xl w-full sm:w-auto hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setTransactionToDelete(null)}>
                   Annuler l&apos;action
                 </Button>
                 <Button type="button" variant="destructive" className="rounded-xl w-full sm:w-auto shadow-md" onClick={() => handleDelete(transactionToDelete._id)}>
                   Supprimer définitivement
                 </Button>
               </DialogFooter>
             </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
