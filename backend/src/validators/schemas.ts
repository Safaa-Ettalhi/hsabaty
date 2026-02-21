import { z } from 'zod';

const deviseEnum = z.enum(['MAD', 'EUR', 'USD', 'GBP']);
const typeTransaction = z.enum(['revenu', 'depense']);
const periodeBudget = z.enum(['mensuel', 'trimestriel', 'annuel']);
const typeObjectif = z.enum(['epargne', 'remboursement', 'fonds_urgence', 'projet']);
const frequenceRecurrente = z.enum(['hebdomadaire', 'mensuel', 'trimestriel', 'annuel']);

export const authInscriptionSchema = z.object({
  body: z.object({
    email: z.string().email('Email invalide').max(255),
    motDePasse: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128),
    nom: z.string().min(1, 'Le nom est requis').max(100).trim(),
    prenom: z.string().max(100).trim().optional(),
    devise: deviseEnum.optional().default('MAD')
  })
});

export const authConnexionSchema = z.object({
  body: z.object({
    email: z.string().email('Email invalide'),
    motDePasse: z.string().min(1, 'Le mot de passe est requis')
  })
});

export const transactionCreerSchema = z.object({
  body: z.object({
    montant: z.number().positive('Le montant doit être positif').finite(),
    type: typeTransaction,
    categorie: z.string().min(1, 'La catégorie est requise').max(100).trim(),
    sousCategorie: z.string().max(100).trim().optional(),
    description: z.string().min(1, 'La description est requise').max(500).trim(),
    date: z.union([z.string(), z.date()]).optional().transform(s => (s ? new Date(s as string) : new Date())),
    tags: z.array(z.string().max(50).trim()).optional().default([])
  })
});

export const transactionModifierSchema = z.object({
  body: z.object({
    montant: z.number().positive().finite().optional(),
    type: typeTransaction.optional(),
    categorie: z.string().min(1).max(100).trim().optional(),
    sousCategorie: z.string().max(100).trim().optional().nullable(),
    description: z.string().min(1).max(500).trim().optional(),
    date: z.string().optional().transform(s => s ? new Date(s) : undefined),
    tags: z.array(z.string().max(50).trim()).optional()
  }).refine(data => Object.values(data).some(v => v !== undefined && v !== null), { message: 'Au moins un champ à modifier est requis' })
});

export const transactionListeQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limite: z.coerce.number().int().min(1).max(200).optional().default(50),
    type: typeTransaction.optional(),
    categorie: z.string().max(100).optional(),
    dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
    dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
    recherche: z.string().max(200).optional(),
    sort: z.enum(['date', 'montant', 'categorie', 'description']).optional().default('date'),
    order: z.enum(['asc', 'desc']).optional().default('desc')
  })
});

export const budgetCreerSchema = z.object({
  body: z.object({
    nom: z.string().min(1, 'Le nom du budget est requis').max(100).trim(),
    montant: z.number().positive('Le montant doit être positif').finite(),
    categorie: z.string().max(100).trim().optional(),
    periode: periodeBudget.default('mensuel')
  })
});

export const budgetModifierSchema = z.object({
  body: z.object({
    nom: z.string().min(1).max(100).trim().optional(),
    montant: z.number().positive().finite().optional(),
    categorie: z.string().max(100).trim().optional().nullable(),
    periode: periodeBudget.optional(),
    actif: z.boolean().optional()
  })
});

export const objectifCreerSchema = z.object({
  body: z.object({
    nom: z.string().min(1, 'Le nom de l\'objectif est requis').max(100).trim(),
    montantCible: z.number().positive('Le montant cible doit être positif').finite(),
    dateLimite: z.string().min(1, 'La date limite est requise').transform(s => new Date(s)),
    categorie: z.string().max(100).trim().optional(),
    type: typeObjectif.optional().default('epargne'),
    description: z.string().max(500).trim().optional()
  })
});

export const objectifModifierSchema = z.object({
  body: z.object({
    nom: z.string().min(1).max(100).trim().optional(),
    montantCible: z.number().positive().finite().optional(),
    montantActuel: z.number().min(0).finite().optional(),
    dateLimite: z.string().optional().transform(s => s ? new Date(s) : undefined),
    categorie: z.string().max(100).trim().optional().nullable(),
    type: typeObjectif.optional(),
    description: z.string().max(500).trim().optional().nullable(),
    actif: z.boolean().optional()
  })
});

export const objectifContributionSchema = z.object({
  body: z.object({
    montant: z.number().positive('Le montant doit être positif').finite()
  })
});

export const agentIAMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Le message est requis').max(4000, 'Message trop long').trim()
  })
});

export const rapportPartagerEmailSchema = z.object({
  body: z.object({
    type: z.enum(['mensuel', 'financier']).optional().default('financier'),
    emailDestinataire: z.string().email('Email destinataire invalide').optional(),
    dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
    dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
    mois: z.coerce.number().int().min(1).max(12).optional(),
    annee: z.coerce.number().int().min(2020).max(2100).optional()
  })
});

export const transactionRecurrenteCreerSchema = z.object({
  body: z.object({
    montant: z.number().positive().finite(),
    type: typeTransaction,
    categorie: z.string().min(1).max(100).trim(),
    sousCategorie: z.string().max(100).trim().optional(),
    description: z.string().min(1).max(500).trim(),
    frequence: frequenceRecurrente,
    jourDuMois: z.number().int().min(1).max(31).optional(),
    jourDeLaSemaine: z.number().int().min(0).max(6).optional()
  })
});

export const dashboardMetriquesQuerySchema = z.object({
  query: z.object({
    periode: z.enum(['mois', 'trimestre', 'semestre', 'annee']).optional().default('mois'),
    dateDebut: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
    dateFin: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()
  })
});
