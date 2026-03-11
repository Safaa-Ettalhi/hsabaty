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
import { Checkbox } from "@/components/ui/checkbox"
import { Controller } from "react-hook-form"
import { IconBell } from "@tabler/icons-react"

type Utilisateur = {
  _id: string
  email: string
  preferences?: {
    notificationsEmail: boolean
    notificationsPush: boolean
  }
}

const schema = z.object({
  notificationsEmail: z.boolean(),
  notificationsPush: z.boolean(),
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
    },
  })

  useEffect(() => {
    api
      .get<{ utilisateur: Utilisateur }>("/api/auth/moi")
      .then((res) => {
        if (res.succes && res.donnees?.utilisateur) {
          const u = res.donnees.utilisateur
          const prefs = u.preferences ?? { notificationsEmail: true, notificationsPush: true }
          form.reset({
            notificationsEmail: prefs.notificationsEmail ?? true,
            notificationsPush: prefs.notificationsPush ?? true,
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
        <Skeleton className="h-65 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-xl font-semibold md:text-2xl">
          <IconBell className="size-6 text-primary" />
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Choisissez comment vous souhaitez être prévenu des événements importants sur Hssabaty.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Canaux de notification</CardTitle>
            <CardDescription>Activez ou désactivez les alertes importantes.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card/50 transition-colors hover:bg-muted/50">
                  <div className="space-y-0.5">
                    <label htmlFor="notif-email" className="text-sm font-medium cursor-pointer">
                      Alertes par email
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Budgets proches du dépassement, objectifs, rapports périodiques.
                    </p>
                  </div>
                  <Controller
                    control={form.control}
                    name="notificationsEmail"
                    render={({ field }) => (
                      <div className="flex items-center h-9">
                        <Checkbox
                          id="notif-email"
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(!!v)}
                        />
                      </div>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card/50 transition-colors hover:bg-muted/50">
                  <div className="space-y-0.5">
                    <label htmlFor="notif-push" className="text-sm font-medium cursor-pointer">
                      Notifications dans le navigateur
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Rappels rapides et informations en temps réel pendant que l’application est ouverte.
                    </p>
                  </div>
                  <Controller
                    control={form.control}
                    name="notificationsPush"
                    render={({ field }) => (
                      <div className="flex items-center h-9">
                        <Checkbox
                          id="notif-push"
                          checked={field.value}
                          onCheckedChange={(v) => field.onChange(!!v)}
                        />
                      </div>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer les préférences"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
