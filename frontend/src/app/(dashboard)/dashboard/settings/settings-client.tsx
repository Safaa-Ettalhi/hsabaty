"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { logoutApi } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Controller } from "react-hook-form"

type Utilisateur = {
  _id: string
  email: string
  nom: string
  prenom?: string
  devise: string
  preferences?: {
    notificationsEmail: boolean
    notificationsPush: boolean
    langue: string
  }
}

const deviseOptions = [
  { value: "MAD", label: "MAD (Dirham)" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
] as const

const langueOptions = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
] as const

const profilSchema = z.object({
  nom: z.string().min(1, "Requis").max(100).trim(),
  prenom: z.string().max(100).trim().optional(),
  devise: z.enum(["MAD", "EUR", "USD", "GBP"]),
  notificationsEmail: z.boolean(),
  notificationsPush: z.boolean(),
  langue: z.enum(["fr", "ar", "en"]),
})

type ProfilFormValues = z.infer<typeof profilSchema>

export function SettingsClient() {
  const router = useRouter()
  const [user, setUser] = useState<Utilisateur | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const form = useForm<ProfilFormValues>({
    mode: "onBlur",
    resolver: zodResolver(profilSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      devise: "MAD",
      notificationsEmail: true,
      notificationsPush: true,
      langue: "fr",
    },
  })

  useEffect(() => {
    api
      .get<{ utilisateur: Utilisateur }>("/api/auth/moi")
      .then((res) => {
        if (res.succes && res.donnees?.utilisateur) {
          const u = res.donnees.utilisateur
          setUser(u)
          const prefs = u.preferences ?? { notificationsEmail: true, notificationsPush: true, langue: "fr" }
          form.reset({
            nom: u.nom,
            prenom: u.prenom ?? "",
            devise: u.devise as ProfilFormValues["devise"],
            notificationsEmail: prefs.notificationsEmail ?? true,
            notificationsPush: prefs.notificationsPush ?? true,
            langue: (prefs.langue ?? "fr") as ProfilFormValues["langue"],
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
      devise: data.devise,
      preferences: {
        notificationsEmail: data.notificationsEmail,
        notificationsPush: data.notificationsPush,
        langue: data.langue,
      },
    })
    setSaving(false)
    if (res.succes) {
      toast.success("Paramètres enregistrés")
      if (res.donnees?.utilisateur) setUser(res.donnees.utilisateur)
    } else toast.error(res.message ?? "Erreur")
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logoutApi()
      router.replace("/login")
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Nom, prénom et devise utilisée dans l’application</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <p className="text-muted-foreground text-xs">L’email ne peut pas être modifié ici.</p>
            </Field>
            <Field>
              <FieldLabel>Devise</FieldLabel>
              <Controller
                control={form.control}
                name="devise"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 w-full max-w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {deviseOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Préférences d’alertes et de langue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="notificationsEmail"
                render={({ field }) => (
                  <Checkbox
                    id="notif-email"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(!!v)}
                  />
                )}
              />
              <label htmlFor="notif-email" className="text-sm font-medium leading-none">
                Recevoir les alertes par email (budgets, objectifs)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Controller
                control={form.control}
                name="notificationsPush"
                render={({ field }) => (
                  <Checkbox
                    id="notif-push"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(!!v)}
                  />
                )}
              />
              <label htmlFor="notif-push" className="text-sm font-medium leading-none">
                Notifications dans le navigateur
              </label>
            </div>
            <Field>
              <FieldLabel>Langue de l’interface</FieldLabel>
              <Controller
                control={form.control}
                name="langue"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9 w-full max-w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {langueOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer les préférences"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-destructive/30">
        <CardHeader>
          <CardTitle>Déconnexion</CardTitle>
          <CardDescription>Se déconnecter de ce compte sur cet appareil</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
