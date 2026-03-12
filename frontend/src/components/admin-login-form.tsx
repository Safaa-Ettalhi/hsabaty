"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { useState } from "react"
import { toast } from "sonner"
const schema = z.object({
  email: z.string().email("Email invalide"),
  motDePasse: z.string().min(1, "Mot de passe requis"),
  rememberMe: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

function getBase() {
  return typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "")
    : ""
}

export function AdminLoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", motDePasse: "", rememberMe: false },
  })

  async function onSubmit(data: FormValues) {
    setError(null)
    const base = getBase()
    const res = await fetch(`${base}/api/admin/auth/connecter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.email,
        motDePasse: data.motDePasse,
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.succes) {
      const msg = json.message || "Connexion échouée"
      setError(msg)
      toast.error(msg)
      return
    }
    const { setAdminSession } = await import("@/lib/admin-auth")
    const admin = json.donnees?.admin
    const token = json.donnees?.token
    if (!admin || !token) {
      setError("Réponse serveur invalide")
      return
    }
    setAdminSession(
      token,
      {
        id: String(admin.id),
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        role: admin.role,
        permissions: admin.permissions || [],
      },
      data.rememberMe ?? false
    )
    toast.success("Connexion administrateur réussie")
    router.push("/admin")
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md rounded-2xl border-zinc-200/80 shadow-lg dark:border-zinc-800">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Administration</CardTitle>
        <CardDescription>
          Connexion réservée aux administrateurs Hssabaty
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="admin-email">Email</FieldLabel>
              <Input
                id="admin-email"
                className="h-11 rounded-xl"
                type="email"
                autoComplete="username"
                {...form.register("email")}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-password">Mot de passe</FieldLabel>
              <PasswordInput
                id="admin-password"
                className="h-11 rounded-xl"
                autoComplete="current-password"
                {...form.register("motDePasse")}
              />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="admin-remember"
                checked={form.watch("rememberMe")}
                onCheckedChange={(c) => form.setValue("rememberMe", !!c)}
              />
              <label htmlFor="admin-remember" className="text-sm text-muted-foreground">
                Se souvenir de moi
              </label>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="h-11 w-full rounded-xl" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Connexion…" : "Se connecter"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
