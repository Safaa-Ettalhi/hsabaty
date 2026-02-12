import mongoose, { Schema, Document } from 'mongoose';

export interface IObjectif extends Document {
  utilisateurId: mongoose.Types.ObjectId;
  nom: string;
  montantCible: number;
  montantActuel: number;
  dateLimite: Date;
  categorie?: string;
  type: 'epargne' | 'remboursement' | 'fonds_urgence' | 'projet';
  description?: string;
  actif: boolean;
  dateCreation: Date;
  dateModification?: Date;
}

const objectifSchema = new Schema<IObjectif>({
  utilisateurId: {
    type: Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  nom: {
    type: String,
    required: [true, 'Le nom de l\'objectif est requis'],
    trim: true
  },
  montantCible: {
    type: Number,
    required: [true, 'Le montant cible est requis'],
    min: [0, 'Le montant doit être positif']
  },
  montantActuel: {
    type: Number,
    default: 0,
    min: [0, 'Le montant actuel doit être positif']
  },
  dateLimite: {
    type: Date,
    required: [true, 'La date limite est requise']
  },
  categorie: {
    type: String
  },
  type: {
    type: String,
    required: true,
    enum: ['epargne', 'remboursement', 'fonds_urgence', 'projet'],
    default: 'epargne'
  },
  description: {
    type: String,
    trim: true
  },
  actif: {
    type: Boolean,
    default: true,
    index: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateModification: {
    type: Date
  }
}, {
  timestamps: true
});

objectifSchema.index({ utilisateurId: 1, actif: 1 });
objectifSchema.index({ utilisateurId: 1, dateLimite: 1 });

export const Objectif = mongoose.model<IObjectif>('Objectif', objectifSchema);
