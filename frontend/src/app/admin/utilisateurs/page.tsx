/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { adminApi } from "@/lib/admin-api"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Search, ChevronLeft, ChevronRight, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const inputClass =
  "h-11 rounded-xl border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50"

type User = {
  _id: string
  email: string
  nom: string
  prenom?: string
  dateCreation?: string
}

export default function AdminUtilisateursPage() {
  const [list, setList] = useState<User[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [recherche, setRecherche] = useState("")
  const [loading, setLoading] = useState(true)
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

  return (
    <DashboardPageShell>
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/30 dark:bg-primary/10 dark:text-primary">
            <Users className="size-3.5" />
            Utilisateurs
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-4xl">
            Comptes utilisateurs
          </h1>
          <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Recherche, consultation et gestion des profils.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Email, nom…"
              className={cn("w-56 pl-9", inputClass)}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(1, recherche)}
            />
          </div>
          <Button
            className="h-11 rounded-xl"
            variant="secondary"
            onClick={() => load(1, recherche)}
          >
            Rechercher
          </Button>
        </div>
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
                  <TableHead className="font-semibold">Création</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-zinc-500"
                    >
                      Aucun utilisateur
                    </TableCell>
                  </TableRow>
                )}
                {list.map((u) => (
                  <TableRow
                    key={u._id}
                    className="border-zinc-100 dark:border-zinc-800/80"
                  >
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      {u.prenom ? `${u.prenom} ` : ""}
                      {u.nom}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {u.dateCreation
                        ? new Date(u.dateCreation).toLocaleDateString("fr-FR")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        asChild
                      >
                        <Link href={`/admin/utilisateurs/${u._id}`}>Détail</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              {pagination.total} utilisateur(s) · page {pagination.page}/
              {pagination.pages}
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
