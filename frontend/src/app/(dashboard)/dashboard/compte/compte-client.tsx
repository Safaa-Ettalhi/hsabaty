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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { 
  IconUser, 
  IconShieldLock, 
  IconMail, 
  IconCircleCheck, 
  IconInfoCircle,
  IconLock
} from "@tabler/icons-react"

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
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
        <Skeleton className="h-65 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 md:p-8 md:pt-6 bg-zinc-50/50 dark:bg-zinc-950/20 min-h-full w-full">
      {/* Header Section */}
      <div className="relative space-y-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Mon compte</h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Personnalisez votre identité et sécurisez votre accès à l&apos;application.
          </p>
        </div>

        {/* Profile Identity Card  */}
        <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-linear-to-br from-white to-zinc-50/50 dark:from-zinc-900/50 dark:to-zinc-950/20 p-6 shadow-sm transition-all hover:shadow-md">
          <div className="absolute -right-6 -top-6 size-48 opacity-10 blur-3xl rounded-full bg-blue-500 transition-opacity group-hover:opacity-20" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="size-20 rounded-2xl bg-blue-50 dark:bg-blue-500/10 backdrop-blur-md flex items-center justify-center text-3xl font-black text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 shadow-sm transition-transform group-hover:scale-105">
              {initials}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                {[user?.nom, user?.prenom].filter(Boolean).join(" ") || "Utilisateur"}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-bold shadow-xs">
                  <IconMail className="size-3.5 text-blue-500" />
                  {user?.email}
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 uppercase tracking-widest">
                  Compte vérifié
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Settings Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 shadow-sm">
                <IconUser className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">Informations Personnelles</h3>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Gérez votre identité publique</p>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field className="space-y-2">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Nom</FieldLabel>
                  <Input 
                    {...form.register("nom")} 
                    className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium shadow-sm" 
                    placeholder="Votre nom"
                  />
                  <FieldError errors={[form.formState.errors.nom]} />
                </Field>
                <Field className="space-y-2">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Prénom</FieldLabel>
                  <Input 
                    {...form.register("prenom")} 
                    className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium shadow-sm"
                    placeholder="Votre prénom"
                  />
                </Field>
              </div>

              <div className="pt-2">
                <Button type="submit" size="lg" disabled={saving} className="w-full h-11 rounded-xl font-black text-sm tracking-tight transition-all active:scale-[0.98] bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                  {saving ? "Mise à jour..." : (
                    <span className="flex items-center gap-2">
                      <IconCircleCheck className="size-5" />
                      Enregistrer le profil
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Security Settings Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <div className="absolute -right-6 -top-6 size-32 opacity-10 blur-2xl rounded-full bg-rose-500 transition-opacity group-hover:opacity-20" />
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 shadow-sm">
                <IconShieldLock className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100">Sécurité de l&apos;accès</h3>
                <p className="text-xs font-bold text-rose-600/80 dark:text-rose-400/80">Protégez votre espace personnel</p>
              </div>
            </div>

            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
              <Field className="space-y-2">
                <FieldLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Mot de passe actuel</FieldLabel>
                <div className="relative">
                  <Input 
                    type="password" 
                    {...passwordForm.register("ancienMotDePasse")} 
                    className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 pr-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-sm"
                    placeholder="••••••••"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                    <IconLock className="size-4" />
                  </div>
                </div>
                <FieldError errors={[passwordForm.formState.errors.ancienMotDePasse]} />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field className="space-y-2">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Nouveau</FieldLabel>
                  <Input 
                    type="password" 
                    {...passwordForm.register("nouveauMotDePasse")} 
                    className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-sm"
                    placeholder="••••••••"
                  />
                  <FieldError errors={[passwordForm.formState.errors.nouveauMotDePasse]} />
                </Field>
                <Field className="space-y-2">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 ml-1">Vérification</FieldLabel>
                  <Input 
                    type="password" 
                    {...passwordForm.register("confirmationMotDePasse")} 
                    className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all shadow-sm"
                    placeholder="••••••••"
                  />
                  <FieldError errors={[passwordForm.formState.errors.confirmationMotDePasse]} />
                </Field>
              </div>

              <div className="pt-2">
                <Button type="submit" size="lg" disabled={changingPassword} className="w-full h-11 rounded-xl font-black text-sm tracking-tight transition-all active:scale-[0.98] bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20">
                  {changingPassword ? "Mise à jour..." : "Mettre à jour l'accès"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Safety Notice - Bottom Panel */}
      <div className="relative overflow-hidden rounded-3xl p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col md:flex-row gap-5 items-center">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <IconInfoCircle className="size-24" />
        </div>
        <div className="size-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 shadow-sm shrink-0">
          <IconInfoCircle className="size-7" />
        </div>
        <div className="space-y-1 text-center md:text-left relative z-10">
          <p className="text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Conseil de sécurité</p>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
            Utilisez un mot de passe robuste et unique. Un mélange équilibré de majuscules, chiffres et symboles garantit la meilleure protection de vos données personnelles et financières.
          </p>
        </div>
      </div>
    </div>
  )
}


