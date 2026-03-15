/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { adminApi } from "@/lib/admin-api"
import { adminHasPermission } from "@/lib/admin-auth"
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Plus, Trash2, ShieldCheck, ShieldX, Edit } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const inputClass =
  "h-11 rounded-xl border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50"

type AdminRow = {
  _id: string
  email: string
  nom: string
  prenom?: string
  role: string
  permissions: string[]
  actif: boolean
}

const createSchema = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(8, "Min. 8 caractères"),
  nom: z.string().min(1),
  prenom: z.string().optional(),
  role: z.enum(["super_admin", "admin", "moderateur"]),
})

const editSchema = z.object({
  email: z.string().email(),
  nom: z.string().min(1),
  prenom: z.string().optional(),
  role: z.enum(["super_admin", "admin", "moderateur"]),
})

const roleStyles: Record<string, { label: string; styles: string; dot: string }> = {
  super_admin: {
    label: "Super Admin",
    styles: "border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-400",
    dot: "bg-purple-500",
  },
  admin: {
    label: "Admin",
    styles: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  moderateur: {
    label: "Modérateur",
    styles: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
  },
}

export default function AdminAdminsPage() {
  const canManage = adminHasPermission("gestion_admins")
  const [list, setList] = useState<AdminRow[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [adminToEdit, setAdminToEdit] = useState<AdminRow | null>(null)
  const [adminToDelete, setAdminToDelete] = useState<AdminRow | null>(null)
  const page = pagination.page

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: "", motDePasse: "", nom: "", prenom: "", role: "admin" },
  })

  const editForm = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: { email: "", nom: "", prenom: "", role: "admin" },
  })

  useEffect(() => {
    if (adminToEdit) {
      editForm.reset({
        email: adminToEdit.email,
        nom: adminToEdit.nom,
        prenom: adminToEdit.prenom || "",
        role: adminToEdit.role as "super_admin" | "admin" | "moderateur",
      })
    }
  }, [adminToEdit])

  function load(p = 1) {
    if (!canManage) return
    setLoading(true)
    const q = new URLSearchParams()
    q.set("page", String(p))
    q.set("limite", "30")
    adminApi
      .get<{ admins: AdminRow[]; pagination: typeof pagination }>(`/api/admin/admins?${q}`)
      .then((res) => {
        if (res.succes && res.donnees) {
          setList(res.donnees.admins)
          setPagination(res.donnees.pagination)
        } else toast.error(res.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(1) }, [])

  async function onCreate(data: z.infer<typeof createSchema>) {
    const res = await adminApi.post("/api/admin/admins", {
      email: data.email,
      motDePasse: data.motDePasse,
      nom: data.nom,
      prenom: data.prenom || undefined,
      role: data.role,
    })
    if (res.succes) {
      toast.success("Administrateur créé")
      setCreateOpen(false)
      createForm.reset()
      load(1)
    } else toast.error(res.message)
  }

  async function onEdit(data: z.infer<typeof editSchema>) {
    if (!adminToEdit) return
    const res = await adminApi.put(`/api/admin/admins/${adminToEdit._id}`, {
      email: data.email,
      nom: data.nom,
      prenom: data.prenom || undefined,
      role: data.role,
    })
    if (res.succes) {
      toast.success("Administrateur mis à jour")
      setAdminToEdit(null)
      load(page)
    } else toast.error(res.message)
  }

  async function toggleActif(a: AdminRow) {
    const res = await adminApi.put(`/api/admin/admins/${a._id}`, { actif: !a.actif })
    if (res.succes) {
      toast.success(a.actif ? "Compte désactivé" : "Compte activé")
      load(page)
    } else toast.error(res.message)
  }

  async function confirmerSupprimer() {
    if (!adminToDelete) return
    const res = await adminApi.delete(`/api/admin/admins/${adminToDelete._id}`)
    if (res.succes) {
      toast.success("Administrateur supprimé")
      setAdminToDelete(null)
      load(page)
    } else toast.error(res.message)
  }

  if (!canManage) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Permission <strong>gestion_admins</strong> requise.
        </div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Comptes Administrateurs"
        description="Création, activation et suppression des accès administration."
        actions={
          <Button className="h-10 rounded-xl px-4 gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nouvel admin
          </Button>
        }
      />

      {/* ── Create Modal ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 shadow-2xl border-border/50 bg-background/90 backdrop-blur-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-semibold tracking-tight">Ajouter un administrateur</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Création d&apos;un nouvel accès administration sur la plateforme.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4 pt-1">
            <Field>
              <FieldLabel className="text-sm font-medium">Email</FieldLabel>
              <Input type="email" placeholder="admin@exemple.com" className={cn(inputClass, "shadow-none")} {...createForm.register("email")} />
            </Field>
            <Field>
              <FieldLabel className="text-sm font-medium">Mot de passe</FieldLabel>
              <Input type="password" placeholder="Min. 8 caractères" className={cn(inputClass, "shadow-none")} {...createForm.register("motDePasse")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel className="text-sm font-medium">Nom</FieldLabel>
                <Input placeholder="Nom" className={cn(inputClass, "shadow-none")} {...createForm.register("nom")} />
              </Field>
              <Field>
                <FieldLabel className="text-sm font-medium">Prénom</FieldLabel>
                <Input placeholder="Prénom" className={cn(inputClass, "shadow-none")} {...createForm.register("prenom")} />
              </Field>
            </div>
            <Field>
              <FieldLabel className="text-sm font-medium">Rôle</FieldLabel>
              <Select
                value={createForm.watch("role")}
                onValueChange={(v) => createForm.setValue("role", v as "super_admin" | "admin" | "moderateur")}
              >
                <SelectTrigger className={cn(inputClass, "shadow-none ring-0 w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderateur">Modérateur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="pt-1">
              <Button type="submit" className="w-full rounded-full h-11 shadow-none font-medium" disabled={createForm.formState.isSubmitting}>
                Créer l&apos;administrateur
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Table ── */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold text-foreground/80">Administrateur</TableHead>
                  <TableHead className="font-semibold text-foreground/80">Rôle</TableHead>
                  <TableHead className="font-semibold text-foreground/80">Statut</TableHead>
                  <TableHead className="w-36 text-center font-semibold text-foreground/80">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-14 text-center text-sm text-muted-foreground">
                      Aucun administrateur trouvé.
                    </TableCell>
                  </TableRow>
                )}
                {list.map((a) => {
                  const rStyle = roleStyles[a.role] ?? { label: a.role, styles: "", dot: "bg-zinc-400" }
                  const initials = (a.prenom?.[0] ?? a.nom?.[0] ?? "?").toUpperCase()
                  return (
                    <TableRow key={a._id} className="border-border hover:bg-muted/20">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 text-xs font-bold text-violet-600 dark:text-violet-400">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-foreground truncate">
                              {a.prenom ? `${a.prenom} ` : ""}{a.nom}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">{a.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", rStyle.styles)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", rStyle.dot)} />
                          {rStyle.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {a.actif === false ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                            Suspendu
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Actif
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl h-8 w-8 text-zinc-500 hover:text-foreground hover:bg-muted"
                            title="Modifier"
                            onClick={() => setAdminToEdit(a)}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("rounded-xl h-8 w-8", a.actif === false
                              ? "text-emerald-600 hover:text-emerald-600 hover:bg-emerald-600/10"
                              : "text-amber-600 hover:text-amber-600 hover:bg-amber-600/10"
                            )}
                            title={a.actif === false ? "Réactiver" : "Suspendre"}
                            onClick={() => toggleActif(a)}
                          >
                            {a.actif === false ? <ShieldCheck className="size-4" /> : <ShieldX className="size-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl h-8 w-8 text-rose-600 hover:text-rose-600 hover:bg-rose-600/10"
                            title="Supprimer"
                            onClick={() => setAdminToDelete(a)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </section>

          {/* ── Edit Modal ── */}
          <Dialog open={!!adminToEdit} onOpenChange={(open) => !open && setAdminToEdit(null)}>
            <DialogContent className="max-w-md rounded-3xl p-6 shadow-2xl border-border/50 bg-background/90 backdrop-blur-2xl">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-xl font-semibold tracking-tight">Modifier l&apos;administrateur</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Modifier les informations ou changer le rôle de cet admin.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4 pt-1">
                <Field>
                  <FieldLabel className="text-sm font-medium">Email</FieldLabel>
                  <Input type="email" className={cn(inputClass, "shadow-none")} {...editForm.register("email")} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel className="text-sm font-medium">Nom</FieldLabel>
                    <Input className={cn(inputClass, "shadow-none")} {...editForm.register("nom")} />
                  </Field>
                  <Field>
                    <FieldLabel className="text-sm font-medium">Prénom</FieldLabel>
                    <Input className={cn(inputClass, "shadow-none")} {...editForm.register("prenom")} />
                  </Field>
                </div>
                <Field>
                  <FieldLabel className="text-sm font-medium">Rôle</FieldLabel>
                  <Select
                    value={editForm.watch("role")}
                    onValueChange={(v) => editForm.setValue("role", v as "super_admin" | "admin" | "moderateur")}
                  >
                    <SelectTrigger className={cn(inputClass, "shadow-none ring-0 w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moderateur">Modérateur</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super admin</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="pt-1">
                  <Button type="submit" className="w-full rounded-full h-11 shadow-none font-medium" disabled={editForm.formState.isSubmitting}>
                    Sauvegarder les modifications
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* ── Delete Confirm Modal ── */}
          <Dialog open={!!adminToDelete} onOpenChange={(open) => !open && setAdminToDelete(null)}>
            <DialogContent className="max-w-sm rounded-[24px] p-6 shadow-2xl border-border/50 bg-background/90 backdrop-blur-2xl text-center gap-0">
              <div className="flex flex-col items-center gap-4 mt-2 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                  <Trash2 className="size-5" />
                </div>
                <div className="space-y-1.5">
                  <DialogTitle className="text-lg font-semibold tracking-tight">Supprimer l&apos;accès</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground text-balance">
                    Supprimer définitivement le compte de{" "}
                    <strong className="font-medium text-foreground">{adminToDelete?.email}</strong> ?<br />
                    Cette action est irréversible.
                  </DialogDescription>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="destructive" className="w-full rounded-full h-11 shadow-none font-medium" onClick={confirmerSupprimer}>
                  Supprimer définitivement
                </Button>
                <Button variant="ghost" className="w-full rounded-full h-11 shadow-none font-medium" onClick={() => setAdminToDelete(null)}>
                  Annuler
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ── Pagination ── */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{list.length}</span> sur{" "}
              <span className="font-medium text-foreground">{pagination.total}</span> administrateurs
              &nbsp;·&nbsp;Page {pagination.page}/{pagination.pages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1" disabled={page <= 1} onClick={() => load(page - 1)}>
                <ChevronLeft className="size-4" /> Précédent
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl h-9 gap-1" disabled={page >= pagination.pages} onClick={() => load(page + 1)}>
                Suivant <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardPageShell>
  )
}
