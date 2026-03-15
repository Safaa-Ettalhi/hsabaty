"use client"

import Link from "next/link"
import { IconChartLine, IconUsers, IconShield, IconSettings, IconHelp } from "@tabler/icons-react"
import { getAdminUser, adminHasPermission } from "@/lib/admin-auth"
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
import { NavSecondary } from "@/components/nav-secondary"
import { Logo } from "@/components/logo"
import { NavAdminUser } from "@/components/nav-admin-user"

const nav = [
  { title: "Tableau de bord", url: "/admin", icon: IconChartLine, perm: null as string | null },
  { title: "Utilisateurs", url: "/admin/utilisateurs", icon: IconUsers, perm: "gestion_utilisateurs" },
  { title: "Administrateurs", url: "/admin/admins", icon: IconShield, perm: "gestion_admins" },
]

const navSecondaryItems = [
  { title: "Paramètres", url: "/admin/settings", icon: IconSettings },
  { title: "Aide", url: "/admin/aide", icon: IconHelp },
]

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = getAdminUser()

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
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavAdminUser user={{ name: `${user.prenom ? `${user.prenom} ` : ""}${user.nom}`, email: user.email }} />}
      </SidebarFooter>
    </Sidebar>
  )
}
