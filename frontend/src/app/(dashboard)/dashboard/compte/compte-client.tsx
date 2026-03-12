"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { updateStoredUser } from "@/lib/auth-mock"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { 
  IconCircleCheck, 
  IconInfoCircle,
  IconLock
} from "@tabler/icons-react"
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"

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

const passwordSchema = z.object({
  ancienMotDePasse: z.string().min(1, "Mot de passe actuel requis"),
  nouveauMotDePasse: z.string().min(8, "8 caractères minimum"),
  confirmationMotDePasse: z.string().min(8, "8 caractères minimum"),
}).refine((data) => data.nouveauMotDePasse === data.confirmationMotDePasse, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmationMotDePasse"],
})

type ProfilFormValues = z.infer<typeof profilSchema>
type PasswordFormValues = z.infer<typeof passwordSchema>


export function CompteClient() {
  const router = useRouter()
  const [user, setUser] = useState<Utilisateur | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const form = useForm<ProfilFormValues>({
    mode: "onBlur",
    resolver: zodResolver(profilSchema),
    defaultValues: {
      nom: "",
      prenom: "",
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      ancienMotDePasse: "",
      nouveauMotDePasse: "",
      confirmationMotDePasse: "",
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


  async function onPasswordSubmit(data: PasswordFormValues) {
    setChangingPassword(true)
    const res = await api.put("/api/auth/modifier-mot-de-passe", {
      ancienMotDePasse: data.ancienMotDePasse,
      nouveauMotDePasse: data.nouveauMotDePasse,
    })
    setChangingPassword(false)
    if (res.succes) {
      toast.success("Mot de passe mis à jour avec succès")
      passwordForm.reset()
    } else {
      toast.error(res.message ?? "Erreur lors de la mise à jour")
    }
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
      <DashboardPageShell contentClassName="gap-6">
        <Skeleton className="h-65 w-full rounded-xl" />
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell contentClassName="gap-6">
      <DashboardPageHeader
        title="Mon compte"
        description="Personnalisez votre identité et sécurisez votre accès à l'application."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informations Personnelles</CardTitle>
            <CardDescription>Gérez votre identité publique</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 rounded-xl border bg-muted/30">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary border">
                {initials}
              </div>
              <div className="text-center sm:text-left">
                <p className="font-semibold text-lg">{[user?.nom, user?.prenom].filter(Boolean).join(" ") || "Utilisateur"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="space-y-1">
                  <FieldLabel className="text-xs font-semibold">Nom</FieldLabel>
                  <Input 
                    {...form.register("nom")} 
                    className="h-9" 
                    placeholder="Votre nom"
                  />
                  <FieldError errors={[form.formState.errors.nom]} />
                </Field>
                <Field className="space-y-1">
                  <FieldLabel className="text-xs font-semibold">Prénom</FieldLabel>
                  <Input 
                    {...form.register("prenom")} 
                    className="h-9"
                    placeholder="Votre prénom"
                  />
                </Field>
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" disabled={saving} className="w-full sm:w-auto">
                  {saving ? "Mise à jour..." : (
                    <span className="flex items-center gap-2">
                      <IconCircleCheck className="size-4" />
                      Enregistrer le profil
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sécurité de l&apos;accès</CardTitle>
            <CardDescription>Protégez votre espace personnel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <Field className="space-y-1">
                <FieldLabel className="text-xs font-semibold">Mot de passe actuel</FieldLabel>
                <div className="relative">
                  <Input 
                    type="password" 
                    {...passwordForm.register("ancienMotDePasse")} 
                    className="h-9 pr-10"
                    placeholder="••••••••"
                  />
                  <IconLock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                <FieldError errors={[passwordForm.formState.errors.ancienMotDePasse]} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field className="space-y-1">
                  <FieldLabel className="text-xs font-semibold">Nouveau</FieldLabel>
                  <Input 
                    type="password" 
                    {...passwordForm.register("nouveauMotDePasse")} 
                    className="h-9"
                    placeholder="••••••••"
                  />
                  <FieldError errors={[passwordForm.formState.errors.nouveauMotDePasse]} />
                </Field>
                <Field className="space-y-1">
                  <FieldLabel className="text-xs font-semibold">Vérification</FieldLabel>
                  <Input 
                    type="password" 
                    {...passwordForm.register("confirmationMotDePasse")} 
                    className="h-9"
                    placeholder="••••••••"
                  />
                  <FieldError errors={[passwordForm.formState.errors.confirmationMotDePasse]} />
                </Field>
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" disabled={changingPassword} className="w-full sm:w-auto">
                  {changingPassword ? "Mise à jour..." : "Mettre à jour l'accès"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col md:flex-row gap-4 items-start p-6">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
            <IconInfoCircle className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-base text-primary">Conseil de sécurité</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Utilisez un mot de passe robuste et unique. Un mélange équilibré de majuscules, chiffres et symboles garantit la meilleure protection de vos données personnelles et financières.
            </p>
          </div>
        </CardContent>
      </Card>
    </DashboardPageShell>
  )
}


