"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { getAdminUser } from "@/lib/admin-auth"
import { adminApi } from "@/lib/admin-api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { toast } from "sonner"
import { IconUserEdit } from "@tabler/icons-react"

const inputClass =
  "h-11 rounded-xl border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50"

const profileSchema = z.object({
  email: z.string().email(),
  nom: z.string().min(1, "Requis"),
  prenom: z.string().optional(),
  motDePasse: z.string().optional(),
})

export function AdminProfileDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const user = getAdminUser()

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || "",
      nom: user?.nom || "",
      prenom: user?.prenom || "",
      motDePasse: "",
    },
  })

  useEffect(() => {
    if (open && user) {
      form.reset({
        email: user.email,
        nom: user.nom,
        prenom: user.prenom || "",
        motDePasse: "",
      })
    }
  }, [open, user, form])

  async function onSubmit(data: z.infer<typeof profileSchema>) {
    const payload: Record<string, unknown> = {
      email: data.email,
      nom: data.nom,
      prenom: data.prenom,
    }
    if (data.motDePasse) {
      if (data.motDePasse.length < 8) {
        toast.error("Le mot de passe doit contenir 8 caractères minimum")
        return
      }
      payload.motDePasse = data.motDePasse
    }

    const res = await adminApi.put("/api/admin/auth/moi", payload)
    if (res.succes) {
      toast.success("Profil mis à jour")
      setOpen(false)
      // On recharge la page pour rafraîchir le nom/email partout, on pourrait aussi modifier le cookie manuellement
      window.location.reload()
    } else {
      toast.error(res.message)
    }
  }

  if (!user) return <>{children}</>

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUserEdit className="size-5 text-violet-600 dark:text-violet-400" />
            Mon Profil Admin
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input type="email" className={inputClass} {...form.register("email")} />
          </Field>
          <Field>
            <FieldLabel>Nom</FieldLabel>
            <Input className={inputClass} {...form.register("nom")} />
          </Field>
          <Field>
            <FieldLabel>Prénom</FieldLabel>
            <Input className={inputClass} {...form.register("prenom")} />
          </Field>
          <Field>
            <FieldLabel>Nouveau mot de passe</FieldLabel>
            <Input
              type="password"
              placeholder="Laisser vide pour ne pas modifier"
              className={inputClass}
              {...form.register("motDePasse")}
            />
          </Field>
          <Button
            type="submit"
            className="w-full h-11 rounded-xl"
            disabled={form.formState.isSubmitting}
          >
            Enregistrer les modifications
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
