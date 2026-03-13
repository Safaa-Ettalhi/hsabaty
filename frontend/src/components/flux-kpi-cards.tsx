"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export function FluxCardEntrees({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
}: {
  title: string
  value: React.ReactNode
  subtitle?: React.ReactNode
  icon: LucideIcon
  className?: string
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-emerald-500/15 bg-linear-to-br from-white to-emerald-50/50 p-6 shadow-sm transition-shadow hover:shadow-md dark:border-emerald-500/10 dark:from-zinc-900 dark:to-emerald-950/20",
        className
      )}
    >
      <div className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
        <Icon className="size-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90 dark:text-emerald-400/90">
        {title}
      </p>
      <div className="mt-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 md:text-3xl">
        {value}
      </div>
      {subtitle && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      )}
    </div>
  )
}
export function FluxCardSorties({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
}: {
  title: string
  value: React.ReactNode
  subtitle?: React.ReactNode
  icon: LucideIcon
  className?: string
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-rose-500/15 bg-linear-to-br from-white to-rose-50/50 p-6 shadow-sm transition-shadow hover:shadow-md dark:border-rose-500/10 dark:from-zinc-900 dark:to-rose-950/20",
        className
      )}
    >
      <div className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
        <Icon className="size-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-rose-600/90 dark:text-rose-400/90">
        {title}
      </p>
      <div className="mt-2 text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-400 md:text-3xl">
        {value}
      </div>
      {subtitle && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      )}
    </div>
  )
}

export function FluxCardSolde({
  title,
  value,
  subtitle,
  icon: Icon,
  positive = true,
  className,
}: {
  title: string
  value: React.ReactNode
  subtitle?: React.ReactNode
  icon: LucideIcon
  positive?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border p-6 shadow-sm transition-shadow hover:shadow-md",
        positive
          ? "border-primary/20 bg-primary text-primary-foreground"
          : "border-amber-500/20 bg-linear-to-br from-amber-600 to-orange-700 text-white",
        className
      )}
    >
      <div className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl bg-white/20 text-white">
        <Icon className="size-5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
        {title}
      </p>
      <div className="mt-2 text-2xl font-bold tabular-nums md:text-3xl">{value}</div>
      {subtitle && <p className="mt-3 text-xs text-white/75">{subtitle}</p>}
    </div>
  )
}
