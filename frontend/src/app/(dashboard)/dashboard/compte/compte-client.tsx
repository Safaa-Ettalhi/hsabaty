"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { updateStoredUser } from "@/lib/auth-mock"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Utilisateur = {
  _id: string
  email: string
  nom: string
  prenom?: string
}

const profilSchema = z.object({
  nom: z.string().min(1, "Requis").max(100).trim(),
  prenom: z.string().max(100).trim().optional(),
})

type ProfilFormValues = z.infer<typeof profilSchema>

export function CompteClient() {
  const router = useRouter()
  const [user, setUser] = useState<Utilisateur | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const form = useForm<ProfilFormValues>({
    mode: "onBlur",
    resolver: zodResolver(profilSchema),
    defaultValues: {
      nom: "",
      prenom: "",
    },
  })

  useEffect(() => {
    api
      .get<{ utilisateur: Utilisateur }>("/api/auth/moi")
      .then((res) => {
        if (res.succes && res.donnees?.utilisateur) {
          const u = res.donnees.utilisateur
          setUser(u)
          form.reset({
            nom: u.nom,
            prenom: u.prenom ?? "",
          })
        }
      })
      .finally(() => setLoading(false))
  }, [form])

  async function onSubmit(data: ProfilFormValues) {
    setSaving(true)
    const res = await api.put<{ utilisateur: Utilisateur }>("/api/auth/moi", {
      nom: data.nom,
      ...(data.prenom !== undefined ? { prenom: data.prenom || null } : {}),
    })
    setSaving(false)
    if (res.succes) {
      toast.success("Profil enregistré")
      if (res.donnees?.utilisateur) {
        const u = res.donnees.utilisateur
        setUser(u)
        const fullName = [u.nom, u.prenom].filter(Boolean).join(" ")
        updateStoredUser({ name: fullName || u.email })
        router.refresh()
      }
    } else toast.error(res.message ?? "Erreur")
  }

  const initials =
    (user?.nom || "")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
        <Skeleton className="h-65 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold md:text-2xl">Mon compte</h1>
        <p className="text-sm text-muted-foreground">
          Gérez vos informations personnelles dans l’application.
        </p>
        <div className="flex items-center gap-3 rounded-lg border bg-card/60 px-3 py-2.5 shadow-sm">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {[user?.nom, user?.prenom].filter(Boolean).join(" ") || "Utilisateur"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informations du profil</CardTitle>
          <CardDescription>Modifiez votre nom et prénom.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Nom</FieldLabel>
                    <Input {...form.register("nom")} className="h-9" />
                    <FieldError errors={[form.formState.errors.nom]} />
                  </Field>
                  <Field>
                    <FieldLabel>Prénom</FieldLabel>
                    <Input {...form.register("prenom")} className="h-9" />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input value={user?.email ?? ""} readOnly disabled className="h-9 bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    L’email ne peut pas être modifié ici.
                  </p>
                </Field>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
