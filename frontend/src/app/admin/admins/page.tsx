"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { adminApi } from "@/lib/admin-api"
import { adminHasPermission } from "@/lib/admin-auth"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Plus, Trash2, Shield } from "lucide-react"
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

export default function AdminAdminsPage() {
  const canManage = adminHasPermission("gestion_admins")
  const [list, setList] = useState<AdminRow[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const page = pagination.page

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      email: "",
      motDePasse: "",
      nom: "",
      prenom: "",
      role: "admin",
    },
  })

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

  useEffect(() => {
    load(1)
  }, [])

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

  async function toggleActif(a: AdminRow) {
    const res = await adminApi.put(`/api/admin/admins/${a._id}`, { actif: !a.actif })
    if (res.succes) {
      toast.success(a.actif ? "Compte désactivé" : "Compte activé")
      load(page)
    } else toast.error(res.message)
  }

  async function supprimer(a: AdminRow) {
    if (!window.confirm(`Supprimer l'admin ${a.email} ?`)) return
    const res = await adminApi.delete(`/api/admin/admins/${a._id}`)
    if (res.succes) {
      toast.success("Administrateur supprimé")
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
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
            <Shield className="size-3.5" />
            Administrateurs
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
            Comptes admin
          </h1>
          <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Création, activation et suppression des accès administration.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 gap-2 rounded-xl">
              <Plus className="size-4" />
              Nouvel admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Créer un administrateur</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={createForm.handleSubmit(onCreate)}
              className="space-y-4 pt-2"
            >
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  className={inputClass}
                  {...createForm.register("email")}
                />
              </Field>
              <Field>
                <FieldLabel>Mot de passe</FieldLabel>
                <Input
                  type="password"
                  className={inputClass}
                  {...createForm.register("motDePasse")}
                />
              </Field>
              <Field>
                <FieldLabel>Nom</FieldLabel>
                <Input className={inputClass} {...createForm.register("nom")} />
              </Field>
              <Field>
                <FieldLabel>Prénom</FieldLabel>
                <Input className={inputClass} {...createForm.register("prenom")} />
              </Field>
              <Field>
                <FieldLabel>Rôle</FieldLabel>
                <Select
                  value={createForm.watch("role")}
                  onValueChange={(v) =>
                    createForm.setValue("role", v as "super_admin" | "admin" | "moderateur")
                  }
                >
                  <SelectTrigger className={cn(inputClass, "h-11")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderateur">Modérateur</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super admin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Button
                type="submit"
                className="rounded-xl"
                disabled={createForm.formState.isSubmitting}
              >
                Créer
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {loading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200 hover:bg-transparent dark:border-zinc-800">
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Nom</TableHead>
                  <TableHead className="font-semibold">Rôle</TableHead>
                  <TableHead className="font-semibold">Actif</TableHead>
                  <TableHead className="w-40"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((a) => (
                  <TableRow
                    key={a._id}
                    className="border-zinc-100 dark:border-zinc-800/80"
                  >
                    <TableCell className="font-medium">{a.email}</TableCell>
                    <TableCell>
                      {a.prenom ? `${a.prenom} ` : ""}
                      {a.nom}
                    </TableCell>
                    <TableCell>{a.role}</TableCell>
                    <TableCell>{a.actif ? "Oui" : "Non"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => toggleActif(a)}
                        >
                          {a.actif ? "Désactiver" : "Activer"}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl text-rose-600"
                          onClick={() => supprimer(a)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              {pagination.total} admin(s) · page {pagination.page}/{pagination.pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={page <= 1}
                onClick={() => load(page - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={page >= pagination.pages}
                onClick={() => load(page + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </DashboardPageShell>
  )
}
