"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils"
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
import { signupSchema, type SignupInput } from "@/lib/validations/auth"
import { mockSignup } from "@/lib/auth-mock"
import { useState } from "react"
import { toast } from "sonner"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  function onSubmit(data: SignupInput) {
    setSubmitError(null)
    const result = mockSignup(data.name, data.email, data.password)
    if (result.success) {
      toast.success("Compte créé. Connectez-vous pour continuer.")
      router.push("/login")
      router.refresh()
    } else {
      setSubmitError(result.error)
      toast.error(result.error)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Créer un compte</CardTitle>
          <CardDescription>
            Entrez vos informations pour créer votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Nom complet</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jean Dupont"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-destructive text-sm mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
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
                <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                <PasswordInput
                  id="password"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-destructive text-sm mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
                <FieldDescription>
                  Le mot de passe doit contenir au moins 8 caractères.
                </FieldDescription>
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
              {submitError && (
                <p className="text-destructive text-sm">{submitError}</p>
              )}
              <Field>
                <Button type="submit" className="w-full">
                  S&apos;inscrire
                </Button>
                <FieldDescription className="text-center">
                  Déjà un compte ?{" "}
                  <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                    Se connecter
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center text-muted-foreground text-sm">
        En continuant, vous acceptez nos{" "}
        <Link href="#" className="underline underline-offset-4">Conditions d&apos;utilisation</Link>{" "}
        et notre{" "}
        <Link href="#" className="underline underline-offset-4">Politique de confidentialité</Link>.
      </FieldDescription>
    </div>
  )
}
