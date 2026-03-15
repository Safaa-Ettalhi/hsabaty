"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { IconChartLine, IconUsers, IconShield, IconLogout } from "@tabler/icons-react"
import { clearAdminSession, getAdminUser, adminHasPermission } from "@/lib/admin-auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/nav-main"
import { Logo } from "@/components/logo"
import { AdminProfileDialog } from "@/components/admin-profile-dialog"

const nav = [
  { title: "Tableau de bord", url: "/admin", icon: IconChartLine, perm: null as string | null },
  { title: "Utilisateurs", url: "/admin/utilisateurs", icon: IconUsers, perm: "gestion_utilisateurs" },
  { title: "Administrateurs", url: "/admin/admins", icon: IconShield, perm: "gestion_admins" },
]

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const user = getAdminUser()

  function logout() {
    clearAdminSession()
    router.push("/admin/login")
    router.refresh()
  }

  const items = nav.filter(item => !item.perm || adminHasPermission(item.perm))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:h-auto! data-[slot=sidebar-menu-button]:min-h-10! data-[slot=sidebar-menu-button]:justify-start! data-[slot=sidebar-menu-button]:p-2!">
              <Link href="/admin" className="flex w-full items-center justify-start">
                <Logo className="h-9 w-auto" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {user && (
              <AdminProfileDialog>
                <SidebarMenuButton className="mb-2 h-auto rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 flex flex-col items-start gap-1 shadow-sm">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate w-full">
                    {user.prenom ? `${user.prenom} ` : ""}
                    {user.nom}
                  </div>
                  <div className="text-xs font-normal text-zinc-500 truncate w-full">
                    Mon profil • {user.email}
                  </div>
                </SidebarMenuButton>
              </AdminProfileDialog>
            )}
            <SidebarMenuButton onClick={logout} className="w-full justify-start text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 border border-zinc-200 dark:border-zinc-800 rounded-xl h-9">
              <IconLogout className="size-4" />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
