import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Objectif } from '../models/Objectif';
import { Conversation } from '../models/Conversation';
import mongoose from 'mongoose';
import { startOfMonth, endOfMonth } from 'date-fns';

export class ServiceAgentIA {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private gemini?: GoogleGenerativeAI;
  private provider: string;
  private model: string;

  constructor() {
    this.provider = process.env.IA_PROVIDER || 'openai';
    this.model = process.env.IA_MODEL || 'gpt-4o-mini';

    if (this.provider === 'gemini') {
      console.log(`[ServiceAgentIA] Provider: ${this.provider}, Model: ${this.model}, API Key: ${process.env.GEMINI_API_KEY ? 'présente' : 'absente'}`);
    }

    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else if (this.provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    } else if (this.provider === 'gemini' && process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      if (!process.env.IA_MODEL) this.model = 'gemini-flash-latest';
    }
  }

// traiter un message utilisateur et générer une réponse avec actions
  async traiterMessage(
    utilisateurId: string,
    messageUtilisateur: string
  ): Promise<{ reponse: string; action?: any }> {
    const contexte = await this.obtenirContexteUtilisateur(utilisateurId);

    const conversation = await Conversation.findOne({ utilisateurId })
      .sort({ dateModification: -1 })
      .limit(1);

    const messagesHistorique = conversation?.messages.slice(-10) || [];

    const promptSystem = this.construirePromptSystem(contexte);

    const messages = [
      { role: 'system' as const, content: promptSystem },
      ...messagesHistorique.map(msg => ({
        role: msg.role === 'utilisateur' ? 'user' as const : 'assistant' as const,
        content: msg.contenu
      })),
      { role: 'user' as const, content: messageUtilisateur }
    ];

    try {
      let reponseIA: string;
      let action: any = null;

      if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: this.model,
          messages: messages as any,
          temperature: 0.7,
          functions: this.obtenirFonctionsIA(),
          function_call: 'auto'
        });

        const choix = completion.choices[0];
        reponseIA = choix.message.content || '';

        if (choix.message.function_call) {
          action = await this.executerAction(
            utilisateurId,
            choix.message.function_call.name,
            JSON.parse(choix.message.function_call.arguments || '{}')
          );
        }
      } else if (this.provider === 'claude' && this.anthropic) {
        const message = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 1024,
          messages: messages as any
        });

        reponseIA = message.content[0].type === 'text' 
          ? message.content[0].text 
          : '';
      } else if (this.provider === 'gemini' && this.gemini) {
        const history = messagesHistorique.map(msg => ({
          role: msg.role === 'utilisateur' ? 'user' as const : 'model' as const,
          parts: [{ text: msg.contenu }]
        }));
        const model = this.gemini.getGenerativeModel({
          model: this.model,
          systemInstruction: promptSystem
        });
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(messageUtilisateur);
        const response = result.response;
        reponseIA = response.text() || '';
      } else {
        throw new Error('Aucun fournisseur IA configuré (OPENAI_API_KEY, ANTHROPIC_API_KEY ou GEMINI_API_KEY selon IA_PROVIDER)');
      }

      await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseIA, action);

      return { reponse: reponseIA, action };
    } catch (error: any) {
      console.error('Erreur lors du traitement du message:', error);
      const msg = error?.message || '';
      if (error?.status === 429 || msg.includes('429') || msg.toLowerCase().includes('quota')) {
        throw new Error(
          "Quota de l'API IA dépassé. Vérifiez votre forfait et la facturation sur le portail du fournisseur (OpenAI, Anthropic ou Google AI Studio pour Gemini), ou réessayez plus tard."
        );
      }
      if (error?.status === 404 || msg.includes('404') || msg.toLowerCase().includes('not found')) {
        if (this.provider === 'gemini') {
          throw new Error(
            `Modèle Gemini "${this.model}" non trouvé. Modèles valides: gemini-flash-latest, gemini-3-flash-preview, gemini-3-pro-preview, gemini-pro-latest. Vérifiez IA_MODEL dans votre .env.`
          );
        }
      }
      throw new Error(`Erreur de l'agent IA: ${msg}`);
    }
  }

//transcrire un fichier audio en texte
  async transcrireAudio(bufferAudio: Buffer, nomFichier = 'audio.webm'): Promise<string> {
    if (!this.openai) {
      throw new Error('La transcription vocale nécessite OpenAI (IA_PROVIDER=openai)');
    }
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const tmpPath = path.join(os.tmpdir(), `hssabaty_${Date.now()}_${path.basename(nomFichier)}`);
    try {
      fs.writeFileSync(tmpPath, bufferAudio);
      const stream = fs.createReadStream(tmpPath) as any;
      const transcription = await this.openai.audio.transcriptions.create({
        file: stream,
        model: 'whisper-1',
        language: 'fr'
      });
      return transcription.text || '';
    } finally {
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }

 //traiter un message vocal : transcription puis réponse IA
  async traiterMessageVocal(utilisateurId: string, bufferAudio: Buffer, nomFichier?: string): Promise<{ reponse: string; action?: any; transcription: string }> {
    const transcription = await this.transcrireAudio(bufferAudio, nomFichier);
    if (!transcription.trim()) {
      return { reponse: 'Je n\'ai pas pu comprendre l\'audio. Pouvez-vous réessayer ou taper votre message ?', transcription: '' };
    }
    const resultat = await this.traiterMessage(utilisateurId, transcription);
    return { ...resultat, transcription };
  }

//construire le prompt système pour l'agent IA
  private construirePromptSystem(contexte: any): string {
    return `Tu es Hssabaty, un assistant IA intelligent et bienveillant pour la gestion financière personnelle.

Ton rôle est d'aider les utilisateurs à gérer leurs finances de manière simple et conversationnelle.

CONTEXTE ACTUEL DE L'UTILISATEUR:
- Solde actuel: ${contexte.solde || 0} ${contexte.devise || 'MAD'}
- Revenus ce mois: ${contexte.revenusMois || 0} ${contexte.devise || 'MAD'}
- Dépenses ce mois: ${contexte.depensesMois || 0} ${contexte.devise || 'MAD'}
- Budgets actifs: ${contexte.budgetsActifs || 0}
- Objectifs actifs: ${contexte.objectifsActifs || 0}

CAPACITÉS:
1. Ajouter des transactions via langage naturel
2. Consulter les transactions et statistiques
3. Créer et gérer des budgets
4. Créer et suivre des objectifs financiers
5. Donner des conseils personnalisés
6. Analyser les habitudes de dépenses

STYLE DE COMMUNICATION:
- Sois amical, professionnel et encourageant
- Utilise un langage simple et accessible
- Sois concis mais complet
- Pose des questions de clarification si nécessaire
- Donne des conseils pratiques et actionnables

CATÉGORIES DISPONIBLES:
Alimentation, Transport, Logement, Santé, Éducation, Divertissement, Shopping, Autres, Salaire, Investissement, Autres revenus

Réponds toujours en français et sois naturel dans tes réponses.`;
  }

//obtenir le contexte financier de l'utilisateur
  private async obtenirContexteUtilisateur(utilisateurId: string): Promise<any> {
    const maintenant = new Date();
    const debutMois = startOfMonth(maintenant);
    const finMois = endOfMonth(maintenant);

    const transactions = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId)
    });

    const solde = transactions.reduce((total, t) => {
      return total + (t.type === 'revenu' ? t.montant : -t.montant);
    }, 0);

    const transactionsMois = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
      date: { $gte: debutMois, $lte: finMois }
    });

    const revenusMois = transactionsMois
      .filter(t => t.type === 'revenu')
      .reduce((sum, t) => sum + t.montant, 0);

    const depensesMois = transactionsMois
      .filter(t => t.type === 'depense')
      .reduce((sum, t) => sum + t.montant, 0);

    const budgetsActifs = await Budget.countDocuments({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
      actif: true
    });

    const objectifsActifs = await Objectif.countDocuments({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
      actif: true
    });

    return {
      solde,
      revenusMois,
      depensesMois,
      budgetsActifs,
      objectifsActifs,
      devise: 'MAD'
    };
  }

//définir les fonctions disponibles pour l'IA
  private obtenirFonctionsIA(): any[] {
    return [
      {
        name: 'ajouter_transaction',
        description: 'Ajoute une nouvelle transaction financière',
        parameters: {
          type: 'object',
          properties: {
            montant: { type: 'number', description: 'Montant de la transaction' },
            type: { type: 'string', enum: ['revenu', 'depense'] },
            categorie: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', description: 'Date au format ISO' }
          },
          required: ['montant', 'type', 'categorie', 'description']
        }
      },
      {
        name: 'creer_budget',
        description: 'Crée un nouveau budget',
        parameters: {
          type: 'object',
          properties: {
            nom: { type: 'string' },
            montant: { type: 'number' },
            categorie: { type: 'string' },
            periode: { type: 'string', enum: ['mensuel', 'trimestriel', 'annuel'] }
          },
          required: ['nom', 'montant', 'periode']
        }
      },
      {
        name: 'creer_objectif',
        description: 'Crée un nouvel objectif financier',
        parameters: {
          type: 'object',
          properties: {
            nom: { type: 'string' },
            montantCible: { type: 'number' },
            dateLimite: { type: 'string', description: 'Date au format ISO' },
            type: { type: 'string', enum: ['epargne', 'remboursement', 'fonds_urgence', 'projet'] }
          },
          required: ['nom', 'montantCible', 'dateLimite']
        }
      }
    ];
  }

//exécuter une action demandée par l'IA
  private async executerAction(utilisateurId: string, nomAction: string, parametres: any): Promise<any> {
    switch (nomAction) {
      case 'ajouter_transaction':
        const transaction = new Transaction({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          montant: parametres.montant,
          type: parametres.type,
          categorie: parametres.categorie,
          description: parametres.description,
          date: parametres.date ? new Date(parametres.date) : new Date(),
          creeParIA: true
        });
        await transaction.save();
        return { type: 'transaction_ajoutee', details: transaction };

      case 'creer_budget':
        const dateDebut = new Date();
        const dateFin = new Date();
        if (parametres.periode === 'mensuel') {
          dateFin.setMonth(dateFin.getMonth() + 1);
        } else if (parametres.periode === 'trimestriel') {
          dateFin.setMonth(dateFin.getMonth() + 3);
        } else {
          dateFin.setFullYear(dateFin.getFullYear() + 1);
        }

        const budget = new Budget({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          nom: parametres.nom,
          montant: parametres.montant,
          categorie: parametres.categorie,
          periode: parametres.periode,
          dateDebut,
          dateFin
        });
        await budget.save();
        return { type: 'budget_cree', details: budget };

      case 'creer_objectif':
        const objectif = new Objectif({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          nom: parametres.nom,
          montantCible: parametres.montantCible,
          dateLimite: new Date(parametres.dateLimite),
          type: parametres.type || 'epargne'
        });
        await objectif.save();
        return { type: 'objectif_cree', details: objectif };

      default:
        return null;
    }
  }

//sauvegarder un message dans la conversation
  private async sauvegarderMessage(
    utilisateurId: string,
    messageUtilisateur: string,
    reponseIA: string,
    action?: any
  ): Promise<void> {
    let conversation = await Conversation.findOne({ utilisateurId })
      .sort({ dateModification: -1 });

    if (!conversation) {
      conversation = new Conversation({
        utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
        messages: []
      });
    }

    conversation.messages.push({
      role: 'utilisateur',
      contenu: messageUtilisateur,
      timestamp: new Date()
    });

    conversation.messages.push({
      role: 'assistant',
      contenu: reponseIA,
      timestamp: new Date(),
      actionEffectuee: action
    });

    conversation.dateModification = new Date();
    await conversation.save();
  }

//catégoriser une transaction
  async categoriserTransaction(description: string): Promise<string> {
    const descriptionLower = description.toLowerCase();
    
    if (descriptionLower.includes('restaurant') || descriptionLower.includes('manger') || descriptionLower.includes('food')) {
      return 'Alimentation';
    }
    if (descriptionLower.includes('taxi') || descriptionLower.includes('transport') || descriptionLower.includes('carburant')) {
      return 'Transport';
    }
    if (descriptionLower.includes('loyer') || descriptionLower.includes('électricité') || descriptionLower.includes('eau')) {
      return 'Logement';
    }
    if (descriptionLower.includes('salaire') || descriptionLower.includes('revenu')) {
      return 'Salaire';
    }

    return 'Autres';
  }
}
