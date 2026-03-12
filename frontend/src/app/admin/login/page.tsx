import Link from "next/link"
import { AdminLoginForm } from "@/components/admin-login-form"
import { Logo } from "@/components/logo"

export const metadata = {
  title: "Connexion admin - Hssabaty",
}

export default function AdminLoginPage() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Link
        href="/"
        className="flex items-center gap-2 self-center font-medium text-foreground"
      >
        <Logo className="h-10 w-auto" />
      </Link>
      <AdminLoginForm />
      <p className="text-center text-xs text-zinc-500">
        <Link href="/login" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          Connexion utilisateur
        </Link>
      </p>
    </div>
  )
}
