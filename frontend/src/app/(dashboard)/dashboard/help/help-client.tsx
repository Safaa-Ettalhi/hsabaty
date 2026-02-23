"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MessageCircle, BookOpen } from "lucide-react"

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
    q: "L’assistant vocal et le chat IA sont-ils sécurisés ?",
    a: "Les échanges avec l’assistant (texte et vocal) sont envoyés de manière sécurisée au serveur. Les conseils et insights sont calculés à partir de vos données pour rester personnels.",
  },
]

const SUPPORT = [
  { label: "Email support", href: "mailto:support@hssabaty.com", icon: Mail },
  { label: "Chat (dans l’app)", href: "/dashboard", icon: MessageCircle },
  { label: "Documentation", href: "#", icon: BookOpen },
]

export function HelpClient() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-5" />
            Foire aux questions
          </CardTitle>
          <CardDescription>
            Réponses aux questions les plus fréquentes sur Hssabaty
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {FAQ.map((item, i) => (
              <li key={i} className="rounded-lg border p-4">
                <h3 className="font-medium">{item.q}</h3>
                <p className="mt-2 text-muted-foreground text-sm">{item.a}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Aide et support</CardTitle>
          <CardDescription>Nous contacter ou accéder à la doc</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {SUPPORT.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <s.icon className="size-5 text-muted-foreground" />
                  <span className="font-medium">{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
