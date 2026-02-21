"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

const SEGMENT_LABELS: Record<string, string> = {
  chat: "Chat",
  dashboard: "Tableau de bord",
  transactions: "Transactions",
  cashflow: "Flux de trésorerie",
  reports: "Rapports",
  budget: "Budget",
  recurring: "Récurrentes",
  goals: "Objectifs",
  insights: "Conseils & Insights",
  settings: "Paramètres",
  help: "Aide",
}

export function SiteHeader() {
  const pathname = usePathname()
  const segments = pathname?.split("/").filter(Boolean) ?? []
  const breadcrumbs = segments.map((segment, i) => ({
    href: "/" + segments.slice(0, i + 1).join("/"),
    label: SEGMENT_LABELS[segment] ?? segment,
    isLast: i === segments.length - 1,
  }))

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.length > 0 ? (
              breadcrumbs.flatMap((b, i) => [
                <BreadcrumbItem key={b.href}>
                  {b.isLast ? (
                    <BreadcrumbPage>{b.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={b.href}>{b.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>,
                ...(i < breadcrumbs.length - 1
                  ? [<BreadcrumbSeparator key={`sep-${b.href}`} />]
                  : []),
              ])
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>Chat</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
