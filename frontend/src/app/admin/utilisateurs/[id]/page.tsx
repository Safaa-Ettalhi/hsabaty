"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { adminApi } from "@/lib/admin-api"
import { DashboardPageShell } from "@/components/dashboard-page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Trash2, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const inputClass =
  "h-11 rounded-xl border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50"

const schema = z.object({
  nom: z.string().min(1),
  prenom: z.string().optional(),
  email: z.string().email(),
})

type FormValues = z.infer<typeof schema>

const cardClass =
  "rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"

export default function AdminUtilisateurDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [loading, setLoading] = useState(true)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nom: "", prenom: "", email: "" },
  })

  useEffect(() => {
    adminApi
      .get<{ utilisateur: { nom: string; prenom?: string; email: string } }>(
        `/api/admin/utilisateurs/${id}`
      )
      .then((res) => {
        if (res.succes && res.donnees) {
          const u = res.donnees.utilisateur
          form.reset({
            nom: u.nom,
            prenom: u.prenom || "",
            email: u.email,
          })
        } else {
          toast.error(res.message)
          router.push("/admin/utilisateurs")
        }
      })
      .finally(() => setLoading(false))
  }, [id, form, router])

  async function onSubmit(data: FormValues) {
    const res = await adminApi.put(`/api/admin/utilisateurs/${id}`, data)
    if (res.succes) toast.success("Utilisateur mis à jour")
    else toast.error(res.message)
  }

  async function supprimer() {
    if (
      !window.confirm(
        "Supprimer définitivement cet utilisateur et toutes ses données ?"
      )
    )
      return
    const res = await adminApi.delete(`/api/admin/utilisateurs/${id}`)
    if (res.succes) {
      toast.success("Utilisateur supprimé")
      router.push("/admin/utilisateurs")
    } else toast.error(res.message)
  }

  if (loading) {
    return (
      <DashboardPageShell>
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="rounded-xl" asChild>
          <Link href="/admin/utilisateurs">
            <ArrowLeft className="mr-2 size-4" />
            Retour à la liste
          </Link>
        </Button>
      </div>

      <header className="space-y-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
          <User className="size-3.5" />
          Fiche utilisateur
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl">
          Modifier le profil
        </h1>
        <p className="text-sm text-zinc-500">ID : {id}</p>
      </header>

      <Card className={cn(cardClass, "max-w-lg")}>
        <CardHeader>
          <CardTitle className="text-lg">Informations</CardTitle>
          <CardDescription>Email et identité affichés côté application.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Field>
              <FieldLabel>Nom</FieldLabel>
              <Input className={inputClass} {...form.register("nom")} />
            </Field>
            <Field>
              <FieldLabel>Prénom</FieldLabel>
              <Input className={inputClass} {...form.register("prenom")} />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                className={inputClass}
                {...form.register("email")}
              />
            </Field>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={form.formState.isSubmitting}
            >
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={cn(cardClass, "max-w-lg border-rose-200/80 dark:border-rose-900/50")}>
        <CardHeader>
          <CardTitle className="text-lg text-rose-600 dark:text-rose-400">
            Zone danger
          </CardTitle>
          <CardDescription>
            Suppression définitive du compte et de toutes les données associées.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            className="gap-2 rounded-xl"
            onClick={supprimer}
          >
            <Trash2 className="size-4" />
            Supprimer l&apos;utilisateur
          </Button>
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}
