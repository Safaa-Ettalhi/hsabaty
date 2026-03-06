"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
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
  preferences?: {
    notificationsEmail: boolean
    notificationsPush: boolean
    langue: string
  }
}

const langueOptions = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
] as const

const schema = z.object({
  notificationsEmail: z.boolean(),
  notificationsPush: z.boolean(),
  langue: z.enum(["fr", "ar", "en"]),
})

type FormValues = z.infer<typeof schema>

export function NotificationsClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const form = useForm<FormValues>({
    mode: "onBlur",
    resolver: zodResolver(schema),
    defaultValues: {
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
          const prefs = u.preferences ?? { notificationsEmail: true, notificationsPush: true, langue: "fr" }
          form.reset({
            notificationsEmail: prefs.notificationsEmail ?? true,
            notificationsPush: prefs.notificationsPush ?? true,
            langue: (prefs.langue ?? "fr") as FormValues["langue"],
          })
        }
      })
      .finally(() => setLoading(false))
  }, [form])

  async function onSubmit(data: FormValues) {
    setSaving(true)
    const res = await api.put<{ utilisateur: Utilisateur }>("/api/auth/moi", {
      preferences: {
        notificationsEmail: data.notificationsEmail,
        notificationsPush: data.notificationsPush,
        langue: data.langue,
      },
    })
    setSaving(false)
    if (res.succes) {
      toast.success("Préférences enregistrées")
    } else toast.error(res.message ?? "Erreur")
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Alertes par email, notifications dans le navigateur et langue de l’interface.
          </CardDescription>
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
                    <SelectTrigger className="h-9 w-full max-w-45">
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
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
