"use client"

import Link from "next/link"
import { Logo } from "@/components/logo"
import { useState } from "react"
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
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth"
import { forgotPasswordApi } from "@/lib/auth"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(data: ForgotPasswordInput) {
    setSending(true)
    const result = await forgotPasswordApi(data.email)
    setSending(false)
    if (result.success) {
      setSent(true)
      toast.success("Si un compte existe pour cette adresse, vous recevrez un e-mail.")
    } else {
      toast.error(result.error)
    }
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
          <CardTitle className="text-xl">Mot de passe oublié</CardTitle>
          <CardDescription>
            Entrez votre adresse e-mail pour recevoir un lien de réinitialisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground text-sm">
                Si un compte existe pour cette adresse, vous recevrez un e-mail avec les instructions.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Retour à la connexion</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Adresse e-mail</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-destructive text-sm mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </Field>
                <Field>
                  <Button type="submit" className="w-full" disabled={sending}>
                    {sending ? "Envoi en cours…" : "Envoyer le lien"}
                  </Button>
                  <FieldDescription className="text-center">
                    <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                      Retour à la connexion
                    </Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
