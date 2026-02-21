"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth"
import { mockResetPassword } from "@/lib/auth-mock"
import { toast } from "sonner"
import { Logo } from "@/components/logo"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  function onSubmit(data: ResetPasswordInput) {
    mockResetPassword(token, data.password)
    toast.success("Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.")
    router.push("/login?reset=success")
    router.refresh()
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Link
        href="/"
        className="flex items-center gap-2 self-center font-medium text-foreground"
      >
        <Logo className="h-10 w-auto" />
      </Link>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Réinitialiser le mot de passe</CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe sécurisé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">Nouveau mot de passe</FieldLabel>
                <PasswordInput
                  id="password"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-destructive text-sm mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirmer le mot de passe
                </FieldLabel>
                <PasswordInput
                  id="confirmPassword"
                  {...form.register("confirmPassword")}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-destructive text-sm mt-1">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </Field>
              <Field>
                <Button type="submit" className="w-full">
                  Réinitialiser
                </Button>
                <FieldDescription className="text-center">
                  <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                    Retour à la connexion
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
