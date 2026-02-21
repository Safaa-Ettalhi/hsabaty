import Link from "next/link"
import { SignupForm } from "@/components/signup-form"
import { Logo } from "@/components/logo"

export const metadata = {
  title: "Inscription - Hssabaty",
  description: "Créez votre compte Hssabaty",
}

export default function SignupPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Link
        href="/"
        className="flex items-center gap-2 self-center font-medium text-foreground"
      >
        <Logo className="h-10 w-auto" />
      </Link>
      <SignupForm />
    </div>
  )
}
