/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useEffect, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, ChevronLeft, ChevronRight, Trash2, ShieldX, ShieldCheck, User } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const inputClass =
  "h-10 rounded-xl border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50"

type User = {
  _id: string
  email: string
  nom: string
  prenom?: string
  dateCreation?: string
  actif?: boolean
}

export default function AdminUtilisateursPage() {
  const [list, setList] = useState<User[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [recherche, setRecherche] = useState("")
  const [loading, setLoading] = useState(true)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const page = pagination.page

  function load(p = 1, search = recherche) {
    setLoading(true)
    const q = new URLSearchParams()
    q.set("page", String(p))
    q.set("limite", "20")
    if (search.trim()) q.set("recherche", search.trim())
    adminApi
      .get<{ utilisateurs: User[]; pagination: typeof pagination }>(
        `/api/admin/utilisateurs?${q}`
      )
      .then((res) => {
        if (res.succes && res.donnees) {
          setList(res.donnees.utilisateurs)
          setPagination(res.donnees.pagination)
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(1, "")
  }, [])

  async function toggleActif(u: User) {
    const newState = u.actif === false ? true : false;
    const res = await adminApi.put(`/api/admin/utilisateurs/${u._id}`, { actif: newState })
    if (res.succes) {
      toast.success(newState ? "Compte réactivé" : "Compte suspendu")
      load(page)
    } else {
      toast.error(res.message)
    }
  }

  async function confirmerSupprimer() {
    if (!userToDelete) return
    const res = await adminApi.delete(`/api/admin/utilisateurs/${userToDelete._id}`)
    if (res.succes) {
      toast.success("Utilisateur supprimé avec succès")
      setUserToDelete(null)
      load(page)
    } else {
      toast.error(res.message)
    }
  }

  return (
    <DashboardPageShell contentClassName="gap-8 pb-10 pt-2">
      <DashboardPageHeader
        title="Comptes Utilisateurs"
        description="Recherche, consultation et gestion des profils inscrits sur la plateforme."
        actions={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Rechercher (Email, nom…)"
                className={cn("w-full pl-9", inputClass)}
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load(1, recherche)}
              />
            </div>
            <Button
              className="h-10 rounded-xl px-4"
              variant="default"
              onClick={() => load(1, recherche)}
            >
              Rechercher
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/20 hover:bg-muted/20">
                  <TableHead className="font-semibold text-foreground/80">Email</TableHead>
                  <TableHead className="font-semibold text-foreground/80">Nom Complet</TableHead>
                  <TableHead className="font-semibold text-foreground/80">Statut</TableHead>
                  <TableHead className="w-36 font-semibold text-center text-foreground/80">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-muted-foreground"
                    >
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                )}
                {list.map((u) => (
                  <TableRow
                    key={u._id}
                    className="border-border hover:bg-muted/30"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary uppercase">
                          {u.prenom ? u.prenom[0] : (u.nom ? u.nom[0] : "")}
                        </div>
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.prenom ? `${u.prenom} ` : ""}
                      {u.nom}
                    </TableCell>
                    <TableCell>
                      {u.actif === false ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Suspendu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Actif
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("rounded-xl", u.actif === false ? "text-emerald-600 hover:text-emerald-600 hover:bg-emerald-600/10" : "text-amber-600 hover:text-amber-600 hover:bg-amber-600/10")}
                          title={u.actif === false ? "Réactiver le compte" : "Suspendre le compte"}
                          onClick={() => toggleActif(u)}
                        >
                          {u.actif === false ? <ShieldCheck className="size-4" /> : <ShieldX className="size-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-xl text-rose-600 hover:text-rose-600 hover:bg-rose-600/10"
                          title="Supprimer définitivement"
                          onClick={() => setUserToDelete(u)}
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



          {/* Delete Confirmation Modal (Ultra Minimalist) */}
          <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
            <DialogContent className="max-w-90 rounded-[24px] p-6 shadow-2xl border-border/50 bg-background/90 backdrop-blur-2xl text-center gap-6">
              <div className="flex flex-col items-center gap-4 mt-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-500">
                  <Trash2 className="size-6" />
                </div>
                <div className="space-y-2">
                  <DialogTitle className="text-lg font-semibold tracking-tight">Supprimer le compte</DialogTitle>
                  <DialogDescription className="text-sm text-balance text-muted-foreground">
                    Êtes-vous sûr de vouloir supprimer <strong className="font-medium text-foreground">{userToDelete?.email}</strong> ? Toutes les données seront effacées.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full mt-2">
                <Button variant="destructive" className="w-full rounded-full shadow-none font-medium h-11" onClick={confirmerSupprimer}>
                  Supprimer définitivement
                </Button>
                <Button variant="ghost" className="w-full rounded-full shadow-none font-medium h-11" onClick={() => setUserToDelete(null)}>
                  Annuler
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex flex-wrap items-center justify-between gap-4 px-1">
            <p className="text-sm font-medium text-muted-foreground">
              Affichage de <span className="text-foreground">{list.length}</span> sur <span className="text-foreground">{pagination.total}</span> utilisateurs (Page {pagination.page} sur {pagination.pages})
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9"
                disabled={page <= 1}
                onClick={() => load(page - 1)}
              >
                <ChevronLeft className="size-4 mr-1" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9"
                disabled={page >= pagination.pages}
                onClick={() => load(page + 1)}
              >
                Suivant
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardPageShell>
  )
}
