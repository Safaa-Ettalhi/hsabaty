"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  IconMessages,
  IconChartLine,
  IconListDetails,
  IconReport,
  IconCoin,
  IconRepeat,
  IconTarget,
  IconBulb,
  IconSettings,
  IconHelp,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getStoredUser } from "@/lib/auth-mock"
import { Logo } from "@/components/logo"

const navMain = [
  { title: "Chat", url: "/chat", icon: IconMessages },
  { title: "Tableau de bord", url: "/dashboard", icon: IconChartLine },
  { title: "Transactions", url: "/dashboard/transactions", icon: IconListDetails },
  { title: "Flux de trésorerie", url: "/dashboard/cashflow", icon: IconReport },
  { title: "Rapports", url: "/dashboard/reports", icon: IconReport },
  { title: "Budget", url: "/dashboard/budget", icon: IconCoin },
  { title: "Récurrentes", url: "/dashboard/recurring", icon: IconRepeat },
  { title: "Objectifs", url: "/dashboard/goals", icon: IconTarget },
  { title: "Conseils & Insights", url: "/dashboard/insights", icon: IconBulb },
]

const navSecondary = [
  { title: "Paramètres", url: "/dashboard/settings", icon: IconSettings },
  { title: "Aide", url: "/dashboard/help", icon: IconHelp },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = useState<{ name: string; email: string; avatar: string } | null>(null)

  useEffect(() => {
    const u = getStoredUser()
    setUser({
      name: u?.name ?? "Utilisateur",
      email: u?.email ?? "utilisateur@exemple.com",
      avatar: "",
    })
  }, [])

  const mockUser = {
    name: user?.name ?? "Utilisateur",
    email: user?.email ?? "utilisateur@exemple.com",
    avatar: "",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!h-auto data-[slot=sidebar-menu-button]:!min-h-10 data-[slot=sidebar-menu-button]:!justify-start data-[slot=sidebar-menu-button]:!p-2">
              <Link href="/chat" className="flex w-full items-center justify-start">
                <Logo className="h-9 w-auto" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={mockUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
