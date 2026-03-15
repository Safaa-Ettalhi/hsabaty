import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUtilisateur extends Document {
  email: string;
  motDePasse: string;
  nom: string;
  prenom?: string;
  actif?: boolean;
  dateCreation: Date;
  derniereConnexion?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  comparerMotDePasse(motDePasse: string): Promise<boolean>;
}

const utilisateurSchema = new Schema<IUtilisateur>({
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  motDePasse: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères']
  },
  nom: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  prenom: {
    type: String,
    trim: true
  },
  actif: {
    type: Boolean,
    default: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  derniereConnexion: {
    type: Date
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

utilisateurSchema.pre('save', async function(next) {
  if (!this.isModified('motDePasse')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

utilisateurSchema.methods.comparerMotDePasse = async function(motDePasse: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, this.motDePasse);
};

export const Utilisateur = mongoose.model<IUtilisateur>('Utilisateur', utilisateurSchema);
