const mongoose = require("mongoose");
const investissementSchema = new mongoose.Schema({
    utilisateurId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
        index: true
    },
    nom: {
        type: String,
        required: [true, 'Le nom est requis'],
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['actions', 'obligations', 'fonds', 'crypto', 'immobilier', 'autre'],
        index: true
    },
    montantInvesti: {
        type: Number,
        required: [true, 'Le montant investi est requis'],
        min: [0, 'Le montant doit être positif']
    },
    valeurActuelle: {
        type: Number,
        min: [0, 'La valeur doit être positive']
    },
    rendementPourcentage: {
        type: Number
    },
    dateAchat: {
        type: Date,
        required: true,
        default: Date.now
    },
    dateValeur: {
        type: Date
    },
    description: {
        type: String,
        trim: true
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
investissementSchema.index({ utilisateurId: 1, actif: 1 });
investissementSchema.index({ utilisateurId: 1, type: 1 });
exports.Investissement = mongoose.model('Investissement', investissementSchema);
