const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, enum: ["utilisateur", "assistant"] },
    contenu: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actionEffectuee: {
      type: { type: String },
      details: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    utilisateurId: { type: mongoose.Schema.Types.ObjectId, ref: "Utilisateur", required: true, index: true },
    titre: String,
    messages: [messageSchema],
    contexte: {
      dernierSolde: Number,
      dernieresTransactions: [String],
      budgetsActifs: [String],
      objectifsActifs: [String],
    },
    dateCreation: { type: Date, default: Date.now },
    dateModification: Date,
  },
  { timestamps: true },
);

conversationSchema.index({ utilisateurId: 1, dateModification: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = { Conversation };
