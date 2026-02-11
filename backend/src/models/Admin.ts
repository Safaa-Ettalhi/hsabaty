import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IAdmin extends Document {
  email: string;
  motDePasse: string;
  nom: string;
  prenom?: string;
  role: 'super_admin' | 'admin' | 'moderateur';
  permissions: string[];
  actif: boolean;
  derniereConnexion?: Date;
  dateCreation: Date;
  comparerMotDePasse(motDePasse: string): Promise<boolean>;
  aPermission(permission: string): boolean;
}

const adminSchema = new Schema<IAdmin>({
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
  role: {
    type: String,
    required: true,
    enum: ['super_admin', 'admin', 'moderateur'],
    default: 'admin'
  },
  permissions: [{
    type: String
  }],
  actif: {
    type: Boolean,
    default: true
  },
  derniereConnexion: {
    type: Date
  },
  dateCreation: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

adminSchema.pre('save', async function(next) {
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

adminSchema.methods.comparerMotDePasse = async function(motDePasse: string): Promise<boolean> {
  return bcrypt.compare(motDePasse, this.motDePasse);
};

adminSchema.methods.aPermission = function(permission: string): boolean {
  if (this.role === 'super_admin') {
    return true;
  }
  
  return this.permissions.includes(permission);
};

adminSchema.pre('save', function(next) {
  if (this.isNew && this.permissions.length === 0) {
    if (this.role === 'super_admin') {
      this.permissions = [
        'gestion_utilisateurs',
        'gestion_transactions',
        'gestion_budgets',
        'gestion_objectifs',
        'gestion_admins',
        'voir_statistiques',
        'exporter_donnees',
        'moderation_contenu'
      ];
    } else if (this.role === 'admin') {
      this.permissions = [
        'gestion_utilisateurs',
        'gestion_transactions',
        'gestion_budgets',
        'gestion_objectifs',
        'voir_statistiques',
        'moderation_contenu'
      ];
    } else if (this.role === 'moderateur') {
      this.permissions = [
        'voir_statistiques',
        'moderation_contenu'
      ];
    }
  }
  next();
});

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);
