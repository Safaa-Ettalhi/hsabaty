import { Suspense } from "react"
import { ResetPasswordForm } from "@/components/reset-password-form"

export const metadata = {
  title: "Réinitialiser le mot de passe - Hssabaty",
  description: "Choisissez un nouveau mot de passe",
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center text-muted-foreground">Chargement...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
