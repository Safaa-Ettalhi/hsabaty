import Link from "next/link"
import { LoginForm } from "@/components/login-form"
import { Logo } from "@/components/logo"

export const metadata = {
  title: "Connexion - Hssabaty",
  description: "Connectez-vous à votre compte Hssabaty",
}

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Link
        href="/"
        className="flex items-center gap-2 self-center font-medium text-foreground"
      >
        <Logo className="h-10 w-auto" />
      </Link>
      <LoginForm />
    </div>
  )
}
