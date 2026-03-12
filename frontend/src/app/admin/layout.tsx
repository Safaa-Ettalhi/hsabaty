import { AdminGuard } from "@/components/admin-guard"
import { AdminShellClient } from "@/components/admin-shell-client"

export const metadata = {
  title: "Administration - Hssabaty",
  description: "Espace d'administration Hssabaty",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminShellClient>{children}</AdminShellClient>
    </AdminGuard>
  )
}
