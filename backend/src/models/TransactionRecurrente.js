const mongoose = require("mongoose");

const transactionRecurrenteSchema = new mongoose.Schema(
  {
    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true, index: true },
    montant: { type: Number, required: [true, "Le montant est requis"], min: [0, "Le montant doit être positif"] },
    type: { type: String, required: true, enum: ["revenu", "depense"] },
    categorie: { type: String, required: [true, "La catégorie est requise"] },
    sousCategorie: String,
    description: { type: String, required: [true, "La description est requise"], trim: true },
    frequence: { type: String, required: true, enum: ["hebdomadaire", "mensuel", "trimestriel", "annuel"] },
    jourDuMois: { type: Number, min: 1, max: 31 },
    jourDeLaSemaine: { type: Number, min: 0, max: 6 },
    prochaineDate: { type: Date, required: true },
    actif: { type: Boolean, default: true, index: true },
    dateCreation: { type: Date, default: Date.now },
    dateModification: Date,
  },
  { timestamps: true },
);

transactionRecurrenteSchema.index({ utilisateurId: 1, actif: 1 });
transactionRecurrenteSchema.index({ utilisateurId: 1, prochaineDate: 1 });

const TransactionRecurrente = mongoose.model("TransactionRecurrente", transactionRecurrenteSchema);
module.exports = { TransactionRecurrente };
