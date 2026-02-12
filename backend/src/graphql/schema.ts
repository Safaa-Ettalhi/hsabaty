import { buildSchema } from 'graphql';

export const schema = buildSchema(`
  type Periode {
    dateDebut: String
    dateFin: String
  }

  type MetriquesDashboard {
    solde: Float
    revenus: Float
    depenses: Float
    revenusNets: Float
    tauxEpargne: Float
  }

  type Dashboard {
    periode: Periode
    metriques: MetriquesDashboard
  }

  type Transaction {
    id: ID
    montant: Float
    type: String
    categorie: String
    description: String
    date: String
  }

  type Budget {
    id: ID
    nom: String
    montant: Float
    categorie: String
    periode: String
    actif: Boolean
  }

  type Objectif {
    id: ID
    nom: String
    montantCible: Float
    montantActuel: Float
    dateLimite: String
    type: String
    actif: Boolean
  }

  type Investissement {
    id: ID
    nom: String
    type: String
    montantInvesti: Float
    valeurActuelle: Float
    rendementPourcentage: Float
    dateAchat: String
    actif: Boolean
  }

  type ResumeInvestissements {
    totalInvesti: Float
    totalValeur: Float
    rendementTotal: Float
  }

  type Query {
    dashboard(periode: String): Dashboard
    transactions(limite: Int, type: String): [Transaction]
    budgets: [Budget]
    objectifs: [Objectif]
    investissements: [Investissement]
    resumeInvestissements: ResumeInvestissements
  }

  input CreerTransactionInput {
    montant: Float!
    type: String!
    categorie: String!
    description: String!
    date: String
  }

  type Mutation {
    creerTransaction(input: CreerTransactionInput!): Transaction
  }
`);
