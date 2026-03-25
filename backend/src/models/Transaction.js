const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true, index: true },
    montant: { type: Number, required: [true, "Le montant est requis"], min: [0, "Le montant doit être positif"] },
    type: { type: String, required: true, enum: ["revenu", "depense"], index: true },
    categorie: { type: String, required: [true, "La catégorie est requise"], index: true },
    sousCategorie: String,
    description: { type: String, required: [true, "La description est requise"], trim: true },
    date: { type: Date, required: true, default: Date.now, index: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    estRecurrente: { type: Boolean, default: false },
    transactionRecurrenteId: { type: mongoose.Schema.Types.ObjectId, ref: "TransactionRecurrente" },
    creeParIA: { type: Boolean, default: false },
    dateCreation: { type: Date, default: Date.now },
    dateModification: Date,
  },
  { timestamps: true },
);

transactionSchema.index({ utilisateurId: 1, type: 1, date: -1 });

transactionSchema.post("save", async (doc) => {
  try {
    const { VectorService } = require("../services/vectorService");
    await VectorService.upsertTransaction(doc);
  } catch (e) {
    console.error("[TransactionModel] Erreur synchro Pinecone:", e);
  }
});

transactionSchema.post("findOneAndDelete", async (doc) => {
  if (!doc) return;
  try {
    const { VectorService } = require("../services/vectorService");
    await VectorService.supprimerTransaction(doc._id.toString());
  } catch (e) {
    console.error("[TransactionModel] Erreur suppression Pinecone:", e);
  }
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = { Transaction };
