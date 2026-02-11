import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  utilisateurId: mongoose.Types.ObjectId;
  montant: number;
  type: 'revenu' | 'depense';
  categorie: string;
  sousCategorie?: string;
  description: string;
  date: Date;
  tags: string[];
  estRecurrente: boolean;
  transactionRecurrenteId?: mongoose.Types.ObjectId;
  creeParIA: boolean; 
  dateCreation: Date;
  dateModification?: Date;
}

const transactionSchema = new Schema<ITransaction>({
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
    enum: ['revenu', 'depense'],
    index: true
  },
  categorie: {
    type: String,
    required: [true, 'La catégorie est requise'],
    index: true
  },
  sousCategorie: {
    type: String
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  estRecurrente: {
    type: Boolean,
    default: false
  },
  transactionRecurrenteId: {
    type: Schema.Types.ObjectId,
    ref: 'TransactionRecurrente'
  },
  creeParIA: {
    type: Boolean,
    default: false
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

transactionSchema.index({ utilisateurId: 1, date: -1 });
transactionSchema.index({ utilisateurId: 1, categorie: 1 });
transactionSchema.index({ utilisateurId: 1, type: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
