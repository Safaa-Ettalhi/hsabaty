import { Response } from 'express';
import multer from 'multer';
import { ServiceAgentIA } from '../services/agentIA';
import { asyncHandler, ErreurApp } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';

const serviceAgentIA = new ServiceAgentIA();

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(webm|mp3|mp4|mpeg|mpga|m4a|wav)$/i.test(file.originalname) ||
      ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/mp4'].includes(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new ErreurApp('Format audio non supporté (webm, mp3, wav, etc.)', 400));
  }
});

export class AgentIAController {
//envoyer un message à l'agent IA
  static envoyerMessage = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new ErreurApp('Le message est requis', 400);
    }

    const resultat = await serviceAgentIA.traiterMessage(
      req.utilisateurId!,
      message.trim(),
      conversationId
    );

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
  static obtenirHistorique = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { Conversation } = await import('../models/Conversation');
    
    const conversations = await Conversation.find({
      utilisateurId: req.utilisateurId
    }).sort({ dateModification: -1 }).select('_id titre dateModification dateCreation messages');

    const donneesRetour: any = {
      conversations: conversations || [],
      messages: conversations.length > 0 ? conversations[0].messages : []
    };

    res.json({
      succes: true,
      donnees: donneesRetour
    });
  });

  static obtenirConversation = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { Conversation } = await import('../models/Conversation');
    const { id } = req.params;

    const conversation = await Conversation.findOne({
      _id: id,
      utilisateurId: req.utilisateurId
    });

    if (!conversation) {
      throw new ErreurApp('Conversation non trouvée', 404);
    }

    res.json({
      succes: true,
      donnees: {
        conversation
      }
    });
  });

  static supprimerConversation = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { Conversation } = await import('../models/Conversation');
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
  static categoriser = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { description } = req.body;

    if (!description) {
      throw new ErreurApp('La description est requise', 400);
    }

    const categorie = await serviceAgentIA.categoriserTransaction(description);

    res.json({
      succes: true,
      donnees: {
        categorie
      }
    });
  });

//message vocal
  static messageVocal = [
    uploadAudio.single('audio'),
    asyncHandler(async (req: AuthentifieRequest, res: Response) => {
      if (!req.file?.buffer) {
        throw new ErreurApp('Fichier audio requis (champ "audio")', 400);
      }
      const { conversationId } = req.body;
      const resultat = await serviceAgentIA.traiterMessageVocal(
        req.utilisateurId!,
        req.file.buffer,
        req.file.originalname,
        conversationId
      );
      res.json({
        succes: true,
        donnees: {
          reponse: resultat.reponse,
          action: resultat.action,
          transcription: resultat.transcription,
          conversationId: resultat.conversationId
        }
      });
    })
  ];
}
