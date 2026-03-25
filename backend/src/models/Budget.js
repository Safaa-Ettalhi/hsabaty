const mongoose = require("mongoose");
const budgetSchema = new mongoose.Schema({
    utilisateurId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
        index: true
    },
    nom: {
        type: String,
        required: [true, 'Le nom du budget est requis'],
        trim: true
    },
    categorie: {
        type: String,
        index: true
    },
    montant: {
        type: Number,
        required: [true, 'Le montant du budget est requis'],
        min: [0, 'Le montant doit être positif']
    },
    periode: {
        type: String,
        required: true,
        enum: ['mensuel', 'trimestriel', 'annuel'],
        default: 'mensuel'
    },
    dateDebut: {
        type: Date,
        required: true,
        default: Date.now
    },
    dateFin: {
        type: Date,
        required: true
    },
    actif: {
        type: Boolean,
        default: true,
        index: true
    },
    alertes: {
        seuil80Pourcent: {
            type: Boolean,
            default: false
        },
        seuil100Pourcent: {
            type: Boolean,
            default: false
        }
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
budgetSchema.index({ utilisateurId: 1, actif: 1, dateDebut: 1, dateFin: 1 });
exports.Budget = mongoose.model('Budget', budgetSchema);
