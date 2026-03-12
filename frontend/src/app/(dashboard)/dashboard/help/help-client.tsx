"use client"
import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MessageCircle, BookOpen, LifeBuoy, ArrowRight, Plus, Minus } from "lucide-react"

const FAQ = [
  {
    q: "Comment ajouter une transaction ?",
    a: "Allez dans Tableau de bord → Transactions, puis cliquez sur « Ajouter une transaction ». Renseignez le montant, le type (revenu ou dépense), la catégorie, la description et la date. Vous pouvez aussi ajouter des tags pour filtrer plus tard.",
  },
  {
    q: "Comment fonctionnent les budgets ?",
    a: "Les budgets permettent de fixer un plafond de dépenses par catégorie et par période (mensuel, trimestriel, annuel). L’app compare vos dépenses réelles au budget et affiche une barre de progression. À 80 % vous êtes en « Attention », au-delà de 100 % le budget est « Dépassé ». Vous pouvez créer, modifier et supprimer des budgets depuis la page Budget.",
  },
  {
    q: "Qu’est-ce qu’une transaction récurrente ?",
    a: "Une récurrente (loyer, abonnement, salaire…) est un modèle qui génère automatiquement des transactions à la fréquence choisie (hebdomadaire, mensuelle, etc.). Vous pouvez éditer ou supprimer une récurrente ; les transactions déjà générées restent dans l’historique.",
  },
  {
    q: "Comment contribuer à un objectif ?",
    a: "Sur la page Objectifs, cliquez sur « Contribuer » pour l’objectif concerné, saisissez le montant et validez. La progression est mise à jour. Vous pouvez aussi modifier ou supprimer un objectif.",
  },
  {
    q: "Comment exporter mes données ?",
    a: "Sur la page Transactions, utilisez les filtres puis le bouton d’export (CSV ou Excel). Les rapports (mensuel, dépenses, revenus, épargne) peuvent être téléchargés en PDF ou envoyés par email depuis la page Rapports.",
  },
  {
    q: "Le chat IA est-il sécurisé ?",
    a: "Les échanges avec l’assistant (chat **texte** uniquement) sont envoyés de manière sécurisée au serveur (HTTPS). Les conseils et insights sont calculés à partir de vos données pour rester personnels.",
  },
]

const SUPPORT = [
  { label: "Email support", href: "mailto:support@hssabaty.com", icon: Mail, hint: "Réponse sous 24h ouvrées" },
  { label: "Chat intégré", href: "/chat", icon: MessageCircle, hint: "Discutez directement avec l’assistant" },
  { label: "Documentation", href: "/dashboard/documentation", icon: BookOpen, hint: "Guides pas à pas et exemples" },
]

import { DashboardPageShell, DashboardPageHeader } from "@/components/dashboard-page-shell"

export function HelpClient() {
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
        badge={{ icon: LifeBuoy, label: "Aide" }}
        title="Centre d'aide"
        description="FAQ, support et liens utiles pour utiliser Hssabaty au quotidien."
      />
      <div className="grid gap-6 md:grid-cols-[1.4fr,1fr]">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="size-5 text-primary" />
              Centre d’aide
            </CardTitle>
            <CardDescription>
              Parcourez les réponses rapides et les ressources pour bien utiliser Hssabaty.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y rounded-lg border bg-card/40">
              {FAQ.map((item, i) => {
                const isOpen = openIndex.has(i)
                return (
                  <li key={i} className="first:rounded-t-lg last:rounded-b-lg">
                    <button
                      type="button"
                      onClick={() => toggle(i)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="text-sm font-medium">{item.q}</span>
                      <span className="flex size-6 shrink-0 items-center justify-center rounded border border-muted-foreground/30 text-sm font-medium">
                        {isOpen ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
                        <p className="text-xs text-muted-foreground">{item.a}</p>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Besoin d&apos;aide ?</CardTitle>
              <CardDescription>Choisissez le canal de support qui vous convient.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-3">
                {SUPPORT.map((s) => (
                  <li key={s.label}>
                    {s.href.startsWith("http") || s.href.startsWith("mailto") ? (
                      <a
                        href={s.href}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-card/40 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
                      >
                        <div className="flex items-center gap-3">
                          <s.icon className="size-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{s.label}</p>
                            {s.hint && <p className="text-xs text-muted-foreground">{s.hint}</p>}
                          </div>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </a>
                    ) : (
                      <Link
                        href={s.href}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-card/40 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
                      >
                        <div className="flex items-center gap-3">
                          <s.icon className="size-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{s.label}</p>
                            {s.hint && <p className="text-xs text-muted-foreground">{s.hint}</p>}
                          </div>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Conseils d&apos;utilisation</CardTitle>
              <CardDescription className="text-xs">
                Quelques bonnes pratiques pour tirer le maximum de la plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>• Enregistrez vos transactions au fil de l&apos;eau pour garder un suivi précis.</li>
                <li>• Utilisez les budgets et objectifs pour vous fixer des limites claires.</li>
                <li>• Consultez régulièrement les rapports et les insights IA pour ajuster vos habitudes.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardPageShell>
  )
}
