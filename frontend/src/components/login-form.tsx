"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"
import { mockLogin, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/auth-mock"
import { useState } from "react"
import { toast } from "sonner"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      rememberMe: false,
    },
  })

  function onSubmit(data: LoginInput) {
    setSubmitError(null)
    const result = mockLogin(data.email, data.password, data.rememberMe ?? false)
    if (result.success) {
      toast.success("Connexion réussie")
      router.push("/chat")
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
          <CardTitle className="text-xl">Bienvenue</CardTitle>
          <CardDescription>
            Connectez-vous à votre compte Hssabaty
          </CardDescription>
          <p className="text-muted-foreground hidden text-center text-xs mt-2">
            Compte démo : <span className="font-mono">{DEMO_EMAIL}</span> / <span className="font-mono">{DEMO_PASSWORD}</span>
          </p>
        </CardHeader>
        <CardContent>
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
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
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
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={form.watch("rememberMe")}
                    onCheckedChange={(checked) =>
                      form.setValue("rememberMe", !!checked)
                    }
                  />
                  <FieldLabel htmlFor="rememberMe" className="font-normal cursor-pointer">
                    Se souvenir de moi
                  </FieldLabel>
                </div>
              </Field>
              {submitError && (
                <p className="text-destructive text-sm">{submitError}</p>
              )}
              <Field>
                <Button type="submit" className="w-full">
                  Se connecter
                </Button>
                <FieldDescription className="text-center">
                  Pas encore de compte ?{" "}
                  <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
                    S&apos;inscrire
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
