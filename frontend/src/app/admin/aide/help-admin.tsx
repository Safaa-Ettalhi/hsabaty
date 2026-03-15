"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LifeBuoy, Plus, Minus, Mail, Shield, Users, Lock, ChevronRight } from "lucide-react"
import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"
import Link from "next/link"

const FAQ = [
  {
    q: "Comment suspendre un utilisateur ?",
    a: "Allez dans Utilisateurs, trouvez l'utilisateur concerné et cliquez sur le switch dans la colonne « Statut ». Un utilisateur suspendu ne pourra plus se connecter à son espace personnel.",
  },
  {
    q: "Quelle est la différence entre Admin et Super Admin ?",
    a: "Un Administrateur peut gérer les utilisateurs (suspendre/activer). Un Super Administrateur peut en plus gérer les autres administrateurs (créer, modifier les rôles, supprimer) et possède des droits de suppression définitive sur les utilisateurs.",
  },
  {
    q: "Puis-je modifier mon propre rôle ?",
    a: "Non, par mesure de sécurité, vous ne pouvez pas modifier votre propre rôle ou supprimer votre propre compte depuis l'interface de gestion des administrateurs.",
  },
  {
    q: "Comment réinitialiser le mot de passe d'un utilisateur ?",
    a: "Pour le moment, le mot de passe peut être modifié par l'utilisateur lui-même depuis son espace compte. En tant qu'admin, vous pouvez gérer son accès global via la suspension.",
  },
  {
    q: "Comment supprimer définitivement un utilisateur ?",
    a: "Seuls les Super Administrateurs ont le bouton de suppression (icône corbeille) dans la liste des utilisateurs. Les administrateurs standards ne peuvent que suspendre les comptes.",
  },
]

const SUPPORT = [
  { label: "Support Technique", href: "mailto:tech@hssabaty.com", icon: Mail, hint: "Assistance administrateur" },
  { label: "Gestion des accès", href: "/admin/admins", icon: Shield, hint: "Gérer les permissions" },
  { label: "Annuaire utilisateurs", href: "/admin/utilisateurs", icon: Users, hint: "Liste de tous les clients" },
]

export function HelpAdmin() {
  const [openIndex, setOpenIndex] = useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    setOpenIndex((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <DashboardPageShell contentClassName="gap-6">
      <DashboardPageHeader
        title="Aide Administration"
        description="Retrouvez ici les guides et réponses pour gérer la plateforme Hssabaty."
      />

      <div className="grid gap-6 md:grid-cols-[1.4fr,1fr]">
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-[24px]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <LifeBuoy className="size-5 text-primary" />
              FAQ Administrateur
            </CardTitle>
            <CardDescription className="text-xs">
              Réponses aux questions courantes sur la gestion de la plateforme.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
              {FAQ.map((item, i) => {
                const isOpen = openIndex.has(i)
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => toggle(i)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.q}</span>
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400">
                        {isOpen ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 px-4 py-4 border-t border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500 leading-relaxed font-medium">{item.a}</p>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-[24px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Support & Liens</CardTitle>
              <CardDescription className="text-xs">Ressources rapides pour l&apos;administration.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {SUPPORT.map((s) => (
                  <li key={s.label}>
                    <Link
                      href={s.href}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/20 px-4 py-3 text-sm transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                          <s.icon className="size-5" />
                        </span>
                        <div>
                          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{s.label}</p>
                          <p className="text-[11px] text-zinc-500">{s.hint}</p>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/20 bg-primary/5 rounded-[24px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-primary">Sécurité Critique</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-3">
                <Lock className="size-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                  Toute action sur les comptes (suspension, suppression, modification de rôle) est enregistrée dans les logs système. Assurez-vous de valider l&apos;identité des administrateurs avant toute promotion au rang de Super Admin.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardPageShell>
  )
}
