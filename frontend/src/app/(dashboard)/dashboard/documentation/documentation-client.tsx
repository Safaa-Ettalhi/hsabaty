"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, ListOrdered, MessageSquare } from "lucide-react"

const GUIDES = [
  {
    id: "transactions",
    title: "Gérer vos transactions",
    steps: [
      "Allez dans **Transactions** depuis le menu.",
      "Cliquez sur **Ajouter une transaction**.",
      "Renseignez le montant, le type (revenu ou dépense), la catégorie et la date.",
      "Optionnel : ajoutez une sous-catégorie, des tags et une description.",
      "Validez pour enregistrer. Vous pouvez modifier ou supprimer une transaction à tout moment.",
    ],
  },
  {
    id: "budget",
    title: "Créer et suivre un budget",
    steps: [
      "Ouvrez la page **Budget**.",
      "Cliquez sur **Créer un budget**.",
      "Choisissez une catégorie (ex. Alimentation, Transport), un montant et une période (mensuel, trimestriel, annuel).",
      "L’app affiche une barre de progression : en dessous de 80 % c’est OK, au-dessus attention, au-delà de 100 % le budget est dépassé.",
      "Modifiez ou supprimez un budget via les actions sur chaque carte.",
    ],
  },
  {
    id: "recurrent",
    title: "Utiliser les transactions récurrentes",
    steps: [
      "Allez dans **Récurrentes**.",
      "Cliquez sur **Ajouter une récurrente**.",
      "Définissez le montant, la catégorie, la fréquence (hebdo, mensuel, etc.) et la date de début.",
      "Les transactions sont générées automatiquement. Les déjà créées restent dans l’historique même si vous supprimez la récurrente.",
    ],
  },
  {
    id: "objectifs",
    title: "Atteindre un objectif d’épargne",
    steps: [
      "Ouvrez **Objectifs**.",
      "Cliquez sur **Créer un objectif** : nom, montant cible, date limite.",
      "Utilisez **Contribuer** sur un objectif pour ajouter un montant ; la progression se met à jour.",
      "Vous pouvez modifier ou supprimer un objectif ; les contributions déjà enregistrées restent.",
    ],
  },
  {
    id: "rapports",
    title: "Exporter et partager vos rapports",
    steps: [
      "**Export CSV/Excel** : page **Transactions**, appliquez les filtres puis utilisez le bouton d’export.",
      "**Rapports** : page **Rapports**, choisissez le type (mensuel, dépenses, revenus, épargne), la période, puis **Télécharger PDF** ou **Partager par email**.",
    ],
  },
]

const EXEMPLES_CHAT = [
  { phrase: "J'ai dépensé 200 MAD en courses hier.", action: "Ajoute une dépense Alimentation, date = hier." },
  { phrase: "Fixer un budget de 3000 MAD pour le transport ce mois.", action: "Crée un budget Transport mensuel 3000 MAD." },
  { phrase: "Mon loyer est de 2500 MAD chaque mois.", action: "Crée une récurrente Logement 2500 MAD/mois." },
  { phrase: "Je veux économiser 10 000 MAD pour un voyage dans 6 mois.", action: "Crée un objectif avec montant et échéance." },
  { phrase: "Où est-ce que je dépense le plus ce mois ?", action: "Réponse basée sur vos données (rapport / insights)." },
]

export function DocumentationClient() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold md:text-2xl">
          <BookOpen className="size-6 text-primary" />
          Documentation
        </h1>
        <p className="text-sm text-muted-foreground">
          Guides pas à pas et exemples pour bien utiliser Hssabaty.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,minmax(320px,400px)]">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListOrdered className="size-5 text-primary" />
                Guides pas à pas
              </CardTitle>
              <CardDescription>
                Suivez ces étapes pour chaque fonctionnalité principale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-0">
              {GUIDES.map((guide) => (
                <section key={guide.id} className="rounded-lg border bg-card/40 p-4">
                  <h2 className="mb-3 text-sm font-semibold">{guide.title}</h2>
                  <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="pl-1">
                        <span
                          className="[&>strong]:font-medium [&>strong]:text-foreground"
                          dangerouslySetInnerHTML={{
                            __html: step.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                          }}
                        />
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-5 text-primary" />
                Exemples avec le chat
              </CardTitle>
              <CardDescription>
                Phrases à taper dans le chat pour déclencher des actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-3">
                {EXEMPLES_CHAT.map((ex, i) => (
                  <li key={i} className="rounded-lg border bg-card/40 p-3">
                    <p className="text-sm font-medium text-foreground">&laquo; {ex.phrase} &raquo;</p>
                    <p className="mt-1 text-xs text-muted-foreground">{ex.action}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Aller plus loin</CardTitle>
              <CardDescription className="text-xs">
                FAQ et support sur la page Aide.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link
                href="/dashboard/help"
                className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
              >
                Voir la page Aide →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
