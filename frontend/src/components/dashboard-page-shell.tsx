"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type ShellProps = {
  children: React.ReactNode
  /** Classes sur le conteneur externe */
  className?: string
  /** Classes sur la zone de contenu  */
  contentClassName?: string
  /** Désactiver le fond en dégradé */
  hideBackground?: boolean
}


export function DashboardPageShell({
  children,
  className,
  contentClassName,
  hideBackground = false,
}: ShellProps) {
  return (
    <div
      className={cn("relative flex min-h-full flex-1 flex-col", className)}
    >
      {!hideBackground && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-emerald-500/[0.07] blur-3xl dark:bg-emerald-500/4" />
          <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-violet-500/[0.07] blur-3xl dark:bg-violet-500/4" />
          <div className="absolute bottom-0 left-1/2 h-56 w-[75%] -translate-x-1/2 rounded-full bg-blue-500/4 blur-3xl" />
        </div>
      )}
      <div
        className={cn(
          "flex flex-1 flex-col gap-8 p-4 pb-10 md:gap-8 md:p-8 md:pt-6",
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

type HeaderProps = {
  badge?: { icon?: LucideIcon; label: string; className?: string }
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

/**
 * En-tête de page aligné sur le style Flux de trésorerie (badge + titre + actions).
 */
export function DashboardPageHeader({
  badge,
  title,
  description,
  actions,
  className,
}: HeaderProps) {
  const BadgeIcon = badge?.icon
  return (
    <header
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        {badge && (
          <div
            className={cn(
              "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
              badge.className ??
                "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400"
            )}
          >
            {BadgeIcon && <BadgeIcon className="size-3.5 shrink-0" />}
            {badge.label}
          </div>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 md:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  )
}

/**
 * Carte / section avec bordure et fond unifiés (remplace les multiples variantes border-zinc-200/80).
 */
export function DashboardSection({
  children,
  className,
  title,
  description,
  headerClassName,
}: {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  headerClassName?: string
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/80",
        className
      )}
    >
      {(title || description) && (
        <div
          className={cn(
            "border-b border-zinc-100 bg-zinc-50/80 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/50",
            headerClassName
          )}
        >
          {title && (
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="p-6">{children}</div>
    </section>
  )
}
