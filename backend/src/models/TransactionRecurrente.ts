import mongoose, { Schema, Document } from 'mongoose';

export interface ITransactionRecurrente extends Document {
  utilisateurId: mongoose.Types.ObjectId;
  montant: number;
  type: 'revenu' | 'depense';
  categorie: string;
  sousCategorie?: string;
  description: string;
  frequence: 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'annuel';
  jourDuMois?: number; 
  jourDeLaSemaine?: number; 
  prochaineDate: Date;
  actif: boolean;
  dateCreation: Date;
  dateModification?: Date;
}

const transactionRecurrenteSchema = new Schema<ITransactionRecurrente>({
  utilisateurId: {
    type: Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  montant: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: [0, 'Le montant doit être positif']
  },
  type: {
    type: String,
    required: true,
    enum: ['revenu', 'depense']
  },
  categorie: {
    type: String,
    required: [true, 'La catégorie est requise']
  },
  sousCategorie: {
    type: String
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true
  },
  frequence: {
    type: String,
    required: true,
    enum: ['hebdomadaire', 'mensuel', 'trimestriel', 'annuel']
  },
  jourDuMois: {
    type: Number,
    min: 1,
    max: 31
  },
  jourDeLaSemaine: {
    type: Number,
    min: 0,
    max: 6
  },
  prochaineDate: {
    type: Date,
    required: true
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

transactionRecurrenteSchema.index({ utilisateurId: 1, actif: 1 });
transactionRecurrenteSchema.index({ utilisateurId: 1, prochaineDate: 1 });

export const TransactionRecurrente = mongoose.model<ITransactionRecurrente>('TransactionRecurrente', transactionRecurrenteSchema);
