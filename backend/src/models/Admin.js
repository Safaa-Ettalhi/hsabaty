const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const PERMISSIONS_SUPER_ADMIN = [
  "gestion_utilisateurs",
  "gestion_transactions",
  "gestion_budgets",
  "gestion_objectifs",
  "gestion_admins",
  "voir_statistiques",
  "exporter_donnees",
  "moderation_contenu",
];

const PERMISSIONS_ADMIN = [
  "gestion_utilisateurs",
  "gestion_transactions",
  "gestion_budgets",
  "gestion_objectifs",
  "voir_statistiques",
  "moderation_contenu",
];

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email invalide"],
    },
    motDePasse: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: [8, "Le mot de passe doit contenir au moins 8 caractères"],
    },
    nom: { type: String, required: [true, "Le nom est requis"], trim: true },
    prenom: { type: String, trim: true },
    role: { type: String, enum: ["super_admin", "admin"], default: "admin" },
    permissions: [{ type: String }],
    actif: { type: Boolean, default: true },
    derniereConnexion: Date,
    dateCreation: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

adminSchema.pre("save", async function save(next) {
  if (this.isNew && (!this.permissions || this.permissions.length === 0)) {
    this.permissions = this.role === "super_admin" ? PERMISSIONS_SUPER_ADMIN : PERMISSIONS_ADMIN;
  }

  if (!this.isModified("motDePasse")) return next();
  try {
    this.motDePasse = await bcrypt.hash(this.motDePasse, 10);
    return next();
  } catch (err) {
    return next(err);
  }
});

adminSchema.methods.comparerMotDePasse = function comparerMotDePasse(motDePasse) {
  return bcrypt.compare(motDePasse, this.motDePasse);
};

adminSchema.methods.aPermission = function aPermission(permission) {
  return this.role === "super_admin" || this.permissions.includes(permission);
};

const Admin = mongoose.model("Admin", adminSchema);
module.exports = { Admin };
