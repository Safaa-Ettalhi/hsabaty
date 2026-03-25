const zod = require("zod");
const typeTransaction = zod.z.enum(['revenu', 'depense']);
const periodeBudget = zod.z.enum(['mensuel', 'trimestriel', 'annuel']);
const typeObjectif = zod.z.enum(['epargne', 'remboursement', 'fonds_urgence', 'projet']);
const frequenceRecurrente = zod.z.enum(['hebdomadaire', 'mensuel', 'trimestriel', 'annuel']);
exports.authInscriptionSchema = zod.z.object({
    body: zod.z.object({
        email: zod.z.string().email('Email invalide').max(255),
        motDePasse: zod.z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128),
        nom: zod.z.string().min(1, 'Le nom est requis').max(100).trim(),
        prenom: zod.z.string().max(100).trim().optional()
    })
});
exports.authConnexionSchema = zod.z.object({
    body: zod.z.object({
        email: zod.z.string().email('Email invalide'),
        motDePasse: zod.z.string().min(1, 'Le mot de passe est requis')
    })
});
exports.authMotDePasseOublieSchema = zod.z.object({
    body: zod.z.object({
        email: zod.z.string().email('Email invalide').max(255)
    })
});
exports.authReinitialiserMotDePasseSchema = zod.z.object({
    body: zod.z.object({
        token: zod.z.string().min(1, 'Le token est requis').max(500),
        nouveauMotDePasse: zod.z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128)
    })
});
exports.authProfilModifierSchema = zod.z.object({
    body: zod.z.object({
        nom: zod.z.string().min(1, 'Le nom est requis').max(100).trim().optional(),
        prenom: zod.z.string().max(100).trim().optional().nullable()
    }).refine(data => Object.keys(data).length > 0, { message: 'Au moins un champ à modifier est requis' })
});
exports.authModifierMotDePasseSchema = zod.z.object({
    body: zod.z.object({
        ancienMotDePasse: zod.z.string().min(1, 'L\'ancien mot de passe est requis'),
        nouveauMotDePasse: zod.z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères').max(128)
    })
});
exports.transactionCreerSchema = zod.z.object({
    body: zod.z.object({
        montant: zod.z.number().positive('Le montant doit être positif').finite(),
        type: typeTransaction,
        categorie: zod.z.string().min(1, 'La catégorie est requise').max(100).trim(),
        sousCategorie: zod.z.string().max(100).trim().optional(),
        description: zod.z.string().min(1, 'La description est requise').max(500).trim(),
        date: zod.z.union([zod.z.string(), zod.z.date()]).optional().transform(s => (s ? new Date(s) : new Date())),
        tags: zod.z.array(zod.z.string().max(50).trim()).optional().default([])
    })
});
exports.transactionModifierSchema = zod.z.object({
    body: zod.z.object({
        montant: zod.z.number().positive().finite().optional(),
        type: typeTransaction.optional(),
        categorie: zod.z.string().min(1).max(100).trim().optional(),
        sousCategorie: zod.z.string().max(100).trim().optional().nullable(),
        description: zod.z.string().min(1).max(500).trim().optional(),
        date: zod.z.string().optional().transform(s => s ? new Date(s) : undefined),
        tags: zod.z.array(zod.z.string().max(50).trim()).optional()
    }).refine(data => Object.values(data).some(v => v !== undefined && v !== null), { message: 'Au moins un champ à modifier est requis' })
});
exports.transactionListeQuerySchema = zod.z.object({
    query: zod.z.object({
        page: zod.z.coerce.number().int().min(1).optional().default(1),
        limite: zod.z.coerce.number().int().min(1).max(200).optional().default(50),
        type: typeTransaction.optional(),
        categorie: zod.z.string().max(100).optional(),
        dateDebut: zod.z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
        dateFin: zod.z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
        recherche: zod.z.string().max(200).optional(),
        sort: zod.z.enum(['date', 'montant', 'categorie', 'description']).optional().default('date'),
        order: zod.z.enum(['asc', 'desc']).optional().default('desc')
    })
});
exports.budgetCreerSchema = zod.z.object({
    body: zod.z.object({
        nom: zod.z.string().min(1, 'Le nom du budget est requis').max(100).trim(),
        montant: zod.z.number().positive('Le montant doit être positif').finite(),
        categorie: zod.z.string().max(100).trim().optional(),
        periode: periodeBudget.default('mensuel')
    })
});
exports.budgetModifierSchema = zod.z.object({
    body: zod.z.object({
        nom: zod.z.string().min(1).max(100).trim().optional(),
        montant: zod.z.number().positive().finite().optional(),
        categorie: zod.z.string().max(100).trim().optional().nullable(),
        periode: periodeBudget.optional(),
        actif: zod.z.boolean().optional()
    })
});
exports.objectifCreerSchema = zod.z.object({
    body: zod.z.object({
        nom: zod.z.string().min(1, 'Le nom de l\'objectif est requis').max(100).trim(),
        montantCible: zod.z.number().positive('Le montant cible doit être positif').finite(),
        dateLimite: zod.z.string().min(1, 'La date limite est requise').transform(s => new Date(s)),
        categorie: zod.z.string().max(100).trim().optional(),
        type: typeObjectif.optional().default('epargne'),
        description: zod.z.string().max(500).trim().optional()
    })
});
exports.objectifModifierSchema = zod.z.object({
    body: zod.z.object({
        nom: zod.z.string().min(1).max(100).trim().optional(),
        montantCible: zod.z.number().positive().finite().optional(),
        montantActuel: zod.z.number().min(0).finite().optional(),
        dateLimite: zod.z.string().optional().transform(s => s ? new Date(s) : undefined),
        categorie: zod.z.string().max(100).trim().optional().nullable(),
        type: typeObjectif.optional(),
        description: zod.z.string().max(500).trim().optional().nullable(),
        actif: zod.z.boolean().optional()
    })
});
exports.objectifContributionSchema = zod.z.object({
    body: zod.z.object({
        montant: zod.z.number().positive('Le montant doit être positif').finite()
    })
});
exports.agentIAMessageSchema = zod.z.object({
    body: zod.z.object({
        message: zod.z.string().min(1, 'Le message est requis').max(4000, 'Message trop long').trim(),
        conversationId: zod.z.string().nullable().optional()
    })
});
exports.rapportPartagerEmailSchema = zod.z.object({
    body: zod.z.object({
        type: zod.z.enum(['mensuel', 'financier']).optional().default('financier'),
        emailDestinataire: zod.z.string().email('Email destinataire invalide').optional(),
        dateDebut: zod.z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
        dateFin: zod.z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
        mois: zod.z.coerce.number().int().min(1).max(12).optional(),
        annee: zod.z.coerce.number().int().min(2020).max(2100).optional()
    })
});
exports.transactionRecurrenteCreerSchema = zod.z.object({
    body: zod.z.object({
        montant: zod.z.number().positive().finite(),
        type: typeTransaction,
        categorie: zod.z.string().min(1).max(100).trim(),
        sousCategorie: zod.z.string().max(100).trim().optional(),
        description: zod.z.string().min(1).max(500).trim(),
        frequence: frequenceRecurrente,
        jourDuMois: zod.z.number().int().min(1).max(31).optional(),
        jourDeLaSemaine: zod.z.number().int().min(0).max(6).optional()
    })
});
exports.dashboardMetriquesQuerySchema = zod.z.object({
    query: zod.z.object({
        periode: zod.z
            .enum(['mois', 'mois_precedent', 'trimestre', 'semestre', 'annee'])
            .optional()
            .default('mois'),
        dateDebut: zod.z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
        dateFin: zod.z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()
    })
});
