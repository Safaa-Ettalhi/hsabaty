const agentIA = require("../services/agentIA");
const gestionErreurs = require("../middleware/gestionErreurs");
const serviceAgentIA = new agentIA.ServiceAgentIA();

const AgentIAController = {};
//envoyer un message à l'agent IA
AgentIAController.envoyerMessage = gestionErreurs.asyncHandler(async (req, res) => {
    const { message, conversationId } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new gestionErreurs.ErreurApp('Le message est requis', 400);
    }
    const resultat = await serviceAgentIA.traiterMessage(req.utilisateurId, message.trim(), conversationId);
    res.json({
        succes: true,
        donnees: {
            reponse: resultat.reponse,
            action: resultat.action,
            conversationId: resultat.conversationId
        }
    });
});
//historique des conversations
AgentIAController.obtenirHistorique = gestionErreurs.asyncHandler(async (req, res) => {
    const { Conversation } = require('../models/Conversation');
    const conversations = await Conversation.find({
        utilisateurId: req.utilisateurId
    }).sort({ dateModification: -1 }).select('_id titre dateModification dateCreation messages');
    const donneesRetour = {
        conversations: conversations || [],
        messages: conversations.length > 0 ? conversations[0].messages : []
    };
    res.json({
        succes: true,
        donnees: donneesRetour
    });
});
AgentIAController.obtenirConversation = gestionErreurs.asyncHandler(async (req, res) => {
    const { Conversation } = require('../models/Conversation');
    const { id } = req.params;
    const conversation = await Conversation.findOne({
        _id: id,
        utilisateurId: req.utilisateurId
    });
    if (!conversation) {
        throw new gestionErreurs.ErreurApp('Conversation non trouvée', 404);
    }
    res.json({
        succes: true,
        donnees: {
            conversation
        }
    });
});
AgentIAController.supprimerConversation = gestionErreurs.asyncHandler(async (req, res) => {
    const { Conversation } = require('../models/Conversation');
    const { id } = req.params;
    await Conversation.findOneAndDelete({
        _id: id,
        utilisateurId: req.utilisateurId
    });
    res.json({
        succes: true,
        message: 'Conversation supprimée'
    });
});
//categoriser une transaction
AgentIAController.categoriser = gestionErreurs.asyncHandler(async (req, res) => {
    const { description } = req.body;
    if (!description) {
        throw new gestionErreurs.ErreurApp('La description est requise', 400);
    }
    const categorie = await serviceAgentIA.categoriserTransaction(description);
    res.json({
        succes: true,
        donnees: {
            categorie
        }
    });
});

module.exports = { AgentIAController };
