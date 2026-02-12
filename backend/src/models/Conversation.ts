import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'utilisateur' | 'assistant';
  contenu: string;
  timestamp: Date;
  actionEffectuee?: {
    type: string; 
    details?: any;
  };
}

export interface IConversation extends Document {
  utilisateurId: mongoose.Types.ObjectId;
  messages: IMessage[];
  contexte: {
    dernierSolde?: number;
    dernieresTransactions?: string[];
    budgetsActifs?: string[];
    objectifsActifs?: string[];
  };
  dateCreation: Date;
  dateModification?: Date;
}

const messageSchema = new Schema<IMessage>({
  role: {
    type: String,
    required: true,
    enum: ['utilisateur', 'assistant']
  },
  contenu: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  actionEffectuee: {
    type: {
      type: String
    },
    details: Schema.Types.Mixed
  }
}, { _id: false });

const conversationSchema = new Schema<IConversation>({
  utilisateurId: {
    type: Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
    index: true
  },
  messages: [messageSchema],
  contexte: {
    dernierSolde: Number,
    dernieresTransactions: [String],
    budgetsActifs: [String],
    objectifsActifs: [String]
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

conversationSchema.index({ utilisateurId: 1, dateModification: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
