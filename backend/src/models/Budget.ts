import mongoose, { Schema, Document } from 'mongoose';

export interface IBudget extends Document {
  utilisateurId: mongoose.Types.ObjectId;
  nom: string;
  categorie?: string; 
  montant: number;
  periode: 'mensuel' | 'trimestriel' | 'annuel';
  dateDebut: Date;
  dateFin: Date;
  actif: boolean;
  alertes: {
    seuil80Pourcent: boolean;
    seuil100Pourcent: boolean;
  };
  dateCreation: Date;
  dateModification?: Date;
}

const budgetSchema = new Schema<IBudget>({
  utilisateurId: {
    type: Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  nom: {
    type: String,
    required: [true, 'Le nom du budget est requis'],
    trim: true
  },
  categorie: {
    type: String,
    index: true
  },
  montant: {
    type: Number,
    required: [true, 'Le montant du budget est requis'],
    min: [0, 'Le montant doit être positif']
  },
  periode: {
    type: String,
    required: true,
    enum: ['mensuel', 'trimestriel', 'annuel'],
    default: 'mensuel'
  },
  dateDebut: {
    type: Date,
    required: true,
    default: Date.now
  },
  dateFin: {
    type: Date,
    required: true
  },
  actif: {
    type: Boolean,
    default: true,
    index: true
  },
  alertes: {
    seuil80Pourcent: {
      type: Boolean,
      default: false
    },
    seuil100Pourcent: {
      type: Boolean,
      default: false
    }
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

budgetSchema.index({ utilisateurId: 1, actif: 1, dateDebut: 1, dateFin: 1 });

export const Budget = mongoose.model<IBudget>('Budget', budgetSchema);
