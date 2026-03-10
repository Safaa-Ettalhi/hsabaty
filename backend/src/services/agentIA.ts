import OpenAI from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Objectif } from '../models/Objectif';
import { Conversation } from '../models/Conversation';
import mongoose from 'mongoose';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export class ServiceAgentIA {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private gemini?: GoogleGenerativeAI;
  private provider: string;
  private model: string;

  constructor() {
    this.provider = process.env.IA_PROVIDER || 'gemini';
    this.model = process.env.IA_MODEL || 'gemini-flash-latest';
    if (this.provider === 'gemini') {
      if (process.env.GEMINI_API_KEY) {
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log(`[ServiceAgentIA] ✅ Gemini configuré - Model: ${this.model}, API Key: présente`);
      } else {
        console.error('[ServiceAgentIA] ❌ GEMINI_API_KEY manquante dans les variables d\'environnement');
        throw new Error('GEMINI_API_KEY est requise pour utiliser Gemini');
      }
    } else if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      console.log(`[ServiceAgentIA] OpenAI configuré - Model: ${this.model}`);
    } else if (this.provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      console.log(`[ServiceAgentIA] Claude configuré - Model: ${this.model}`);
    } else {
      console.error(`[ServiceAgentIA] ❌ Aucun provider IA valide configuré. Provider demandé: ${this.provider}`);
      throw new Error(`Aucun fournisseur IA configuré pour: ${this.provider}. Vérifiez IA_PROVIDER et les clés API correspondantes.`);
    }
  }

  private detecterLangue(message: string): 'fr' | 'en' | 'ar' {
    if (!message) return 'fr';
    const hasArabic = /[\u0600-\u06FF]/.test(message);
    if (hasArabic) return 'ar';
    const lower = message.toLowerCase();
    const englishKeywords = ['how', 'much', 'spent', 'spend', 'salary', 'rent', 'income', 'expense', 'savings'];
    if (englishKeywords.some((k) => lower.includes(k))) return 'en';
    const hasFrenchAccents = /[éèêàçùôîï]/i.test(message);
    if (hasFrenchAccents) return 'fr';
    return 'fr';
  }

// traiter un message utilisateur et générer une réponse avec actions
  async traiterMessage(
    utilisateurId: string,
    messageUtilisateur: string
  ): Promise<{ reponse: string; action?: any }> {
    const langue = this.detecterLangue(messageUtilisateur);
    const contexte = await this.obtenirContexteUtilisateur(utilisateurId);
    (contexte as any).langue = langue;
    const intentionInitiale = this.detecterIntention(messageUtilisateur);
    // Exécution directe pour les intentions de création (sans passer par le modèle)
    if (intentionInitiale) {
      let actionDirecte: any = null;
      try {
        if (intentionInitiale.type === 'creer_budget' && intentionInitiale.parametres) {
          actionDirecte = await this.executerAction(utilisateurId, 'creer_budget', intentionInitiale.parametres);
        } else if (intentionInitiale.type === 'creer_objectif' && intentionInitiale.parametres) {
          actionDirecte = await this.executerAction(utilisateurId, 'creer_objectif', intentionInitiale.parametres);
        } else if (intentionInitiale.type === 'creer_transaction_recurrente' && intentionInitiale.parametres) {
          actionDirecte = await this.executerAction(utilisateurId, 'creer_transaction_recurrente', intentionInitiale.parametres);
        } else if (intentionInitiale.type === 'creer_investissement' && intentionInitiale.parametres) {
          actionDirecte = await this.executerAction(utilisateurId, 'creer_investissement', intentionInitiale.parametres);
        } else if (intentionInitiale.type === 'ajouter_transaction' && intentionInitiale.parametres) {
          actionDirecte = await this.executerAction(utilisateurId, 'ajouter_transaction', intentionInitiale.parametres);
        }
      } catch (e) {
        console.error('[ServiceAgentIA] Erreur lors de l\'exécution directe de l\'intention:', e);
      }

      if (actionDirecte) {
        const reponseDirecte = this.genererReponseDepuisAction(actionDirecte, contexte);
        await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseDirecte, actionDirecte);
        return { reponse: reponseDirecte, action: actionDirecte };
      }
    }

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
          if (action) {
            reponseIA = this.genererReponseDepuisAction(action, contexte);
          }
        } else {
          const intention = this.detecterIntention(messageUtilisateur);
          if (intention && (intention.type === 'gerer_objectif' || intention.type === 'gerer_budget' || intention.type === 'statistiques' || intention.type === 'analyser_habitudes')) {
            const actionDetectee = await this.executerActionDetectee(utilisateurId, intention);
            if (actionDetectee) {
              action = actionDetectee;
              reponseIA = this.genererReponseDepuisAction(action, contexte);
            }
          }
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

        const intention = this.detecterIntention(messageUtilisateur);
        if (intention) {
          action = await this.executerActionDetectee(utilisateurId, intention);
          if (action) {
            reponseIA = this.genererReponseDepuisAction(action, contexte);
          }
        }
      } else if (this.provider === 'gemini' && this.gemini) {
        try {
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

          if (!reponseIA || reponseIA.trim().length === 0) {
            const intention = this.detecterIntention(messageUtilisateur);
            if (intention) {
              action = await this.executerActionDetectee(utilisateurId, intention);
              if (action) {
                reponseIA = this.genererReponseDepuisAction(action, contexte);
              } else {
                reponseIA = 'Je traite votre demande...';
              }
            } else {
              reponseIA = 'Je comprends votre message. Comment puis-je vous aider avec vos finances ?';
            }
          }
          const intention = this.detecterIntention(messageUtilisateur);
          if (intention) {
            const actionDetectee = await this.executerActionDetectee(utilisateurId, intention);
            if (actionDetectee) {
              action = actionDetectee;
              reponseIA = this.genererReponseDepuisAction(action, contexte);
            }
          }
        } catch (geminiError: any) {
          const errorMessage = geminiError?.message || '';
          const errorStatus = geminiError?.status || geminiError?.response?.status;
          
          const isQuotaError = errorStatus === 429 || 
                              errorStatus === 403 || 
                              errorStatus === 401 ||
                              errorMessage.includes('quota') ||
                              errorMessage.includes('Quota') ||
                              errorMessage.includes('billing') ||
                              errorMessage.includes('credit');
          
          if (isQuotaError && process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_FALLBACK === 'true') {
            console.warn(`[ServiceAgentIA] ⚠️ Crédit Gemini épuisé (${errorStatus}), basculement vers Nemotron 3 Nano 30B A3B`);
            try {
              reponseIA = await this.appelerNemotronViaOpenRouter(messagesHistorique, messageUtilisateur, promptSystem);
              const intention = this.detecterIntention(messageUtilisateur);
              if (intention) {
                const actionDetectee = await this.executerActionDetectee(utilisateurId, intention);
                if (actionDetectee) {
                  action = actionDetectee;
                  reponseIA = this.genererReponseDepuisAction(action, contexte);
                }
              }
            } catch (nemotronError: any) {
              console.error('[ServiceAgentIA] ❌ Erreur Nemotron, utilisation de la détection d\'intention:', nemotronError.message);
              const intention = this.detecterIntention(messageUtilisateur);
              if (intention) {
                action = await this.executerActionDetectee(utilisateurId, intention);
                reponseIA = action 
                  ? this.genererReponseDepuisAction(action, contexte)
                  : 'Je traite votre demande. Veuillez patienter...';
              } else {
                reponseIA = 'Je comprends votre message. Comment puis-je vous aider avec vos finances ?';
              }
            }
          } else {
            console.warn('[ServiceAgentIA] Erreur Gemini, utilisation de la détection d\'intention:', errorMessage);
            const intention = this.detecterIntention(messageUtilisateur);
            if (intention) {
              action = await this.executerActionDetectee(utilisateurId, intention);
              reponseIA = action 
                ? this.genererReponseDepuisAction(action, contexte)
                : 'Je traite votre demande. Veuillez patienter...';
            } else {
              reponseIA = 'Je comprends votre message. Comment puis-je vous aider avec vos finances ?';
            }
          }
        }
      } else {
        throw new Error('Aucun fournisseur IA configuré (OPENAI_API_KEY, ANTHROPIC_API_KEY ou GEMINI_API_KEY selon IA_PROVIDER)');
      }

      if (action && action.type === 'budgets_trouves' && action.nombre === 0) {
        const intentionCreation = this.extraireInfosBudget(messageUtilisateur);
        if (intentionCreation && intentionCreation.parametres) {
          const actionBudget = await this.executerAction(utilisateurId, 'creer_budget', intentionCreation.parametres);
          const reponseBudget = this.genererReponseDepuisAction(actionBudget, contexte);
          await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseBudget, actionBudget);
          return { reponse: reponseBudget, action: actionBudget };
        }
      }

      if (!reponseIA || reponseIA.trim().length === 0) {
        reponseIA = action
          ? this.genererReponseDepuisAction(action, contexte)
          : 'Je comprends votre message. Comment puis-je vous aider avec vos finances ?';
      }

      await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseIA, action);

      return { reponse: reponseIA, action };
    } catch (error: any) {
      console.error('Erreur lors du traitement du message:', error);
      const msg = error?.message || '';
      
      const isQuotaError = error?.status === 429 || 
                          error?.status === 403 || 
                          error?.status === 401 ||
                          msg.includes('quota') ||
                          msg.includes('Quota') ||
                          msg.includes('billing') ||
                          msg.includes('credit');
      
      if ((isQuotaError || error?.status === 503 || msg.includes('503') || msg.includes('Service Unavailable')) && this.provider === 'gemini') {
        if (isQuotaError && process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_FALLBACK === 'true') {
          console.warn('[ServiceAgentIA] ⚠️ Crédit Gemini épuisé, basculement vers Nemotron 3 Nano 30B A3B');
          try {
            const contexte = await this.obtenirContexteUtilisateur(utilisateurId);
            const promptSystem = this.construirePromptSystem(contexte);
            const conversation = await Conversation.findOne({ utilisateurId })
              .sort({ dateModification: -1 })
              .limit(1);
            
            const messagesHistorique = conversation?.messages.slice(-10).map((msg: any) => ({
              role: msg.role,
              contenu: msg.contenu
            })) || [];
            
            let reponseIA = await this.appelerNemotronViaOpenRouter(messagesHistorique, messageUtilisateur, promptSystem);
            
            const intention = this.detecterIntention(messageUtilisateur);
            let action: any = null;
            
            if (intention) {
              action = await this.executerActionDetectee(utilisateurId, intention);
              if (action) {
                reponseIA = this.genererReponseDepuisAction(action, contexte);
              }
            }
            
            await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseIA, action);
            return { reponse: reponseIA, action };
          } catch (nemotronError: any) {
            console.error('[ServiceAgentIA] ❌ Erreur Nemotron, utilisation de la détection d\'intention:', nemotronError.message);
          }
        }
        
        console.warn('[ServiceAgentIA] Gemini indisponible, utilisation de la détection d\'intention comme fallback');
        try {
          const contexte = await this.obtenirContexteUtilisateur(utilisateurId);
          const intention = this.detecterIntention(messageUtilisateur);
          let reponseIA = 'Je traite votre demande...';
          let action: any = null;

          if (intention) {
            action = await this.executerActionDetectee(utilisateurId, intention);
            reponseIA = action 
              ? this.genererReponseDepuisAction(action, contexte)
              : 'Je comprends votre message. Comment puis-je vous aider avec vos finances ?';
          } else {
            reponseIA = 'Je comprends votre message. Comment puis-je vous aider avec vos finances ?';
          }

          await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseIA, action);
          return { reponse: reponseIA, action };
        } catch (fallbackError: any) {
          console.error('Erreur lors du fallback:', fallbackError);
          const reponseParDefaut = 'Je comprends votre message. Le service IA est temporairement indisponible, mais votre demande a été enregistrée.';
          await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseParDefaut);
          return { reponse: reponseParDefaut };
        }
      }

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


  async genererConseils(prompt: string): Promise<{ reponse: string }> {
    try {
      const systemInstruction = "Tu es un expert financier. Tu DOIS ABSOLUMENT RÉPONDRE EN FRANÇAIS QUEL QUE SOIT LE CONTEXTE. Sois précis, structuré et professionnel.";
      if (this.provider === 'openai' && this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        });
        return { reponse: completion.choices[0].message.content || '' };
      } else if (this.provider === 'claude' && this.anthropic) {
        const message = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 1024,
          system: systemInstruction,
          messages: [{ role: 'user', content: prompt }]
        });
        return { reponse: message.content[0].type === 'text' ? message.content[0].text : '' };
      } else if (this.provider === 'gemini' && this.gemini) {
        const model = this.gemini.getGenerativeModel({
          model: this.model,
          systemInstruction: systemInstruction
        });
        const result = await model.generateContent(prompt);
        return { reponse: result.response.text() || '' };
      }
      return { reponse: "" };
    } catch (e) {
      console.error("[ServiceAgentIA] Erreur genererConseils", e);
      return { reponse: "Voici quelques conseils généraux: \n1. Suivez vos dépenses.\n2. Épargnez régulièrement." };
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
        model: 'whisper-1'
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
    const langue = (contexte && (contexte as any).langue) || 'fr';
    const descriptionLangue = langue === 'en'
      ? 'anglais'
      : langue === 'ar'
        ? 'arabe (dialecte marocain simple)'
        : 'français';

    return `Tu es Hssabaty, un assistant IA intelligent et bienveillant pour la gestion financière personnelle.

Ton rôle est d'aider les utilisateurs à gérer leurs finances de manière simple et conversationnelle.

LANGUE DE RÉPONSE:
- L'utilisateur peut parler français, anglais ou arabe (dialecte marocain).
- Le dernier message est en: ${descriptionLangue}.
- Tu dois TOUJOURS répondre dans la même langue que le DERNIER message de l'utilisateur. 
- Si le message est en français, réponds en français.
- S'il est en anglais, réponds en anglais.
- S'il est en arabe/darija, réponds en arabe clair et simple.

⚠️ IMPORTANT - UTILISATION AUTOMATIQUE DES FONCTIONS:
Tu DOIS automatiquement utiliser les fonctions disponibles lorsque l'utilisateur demande une action. Ne demande JAMAIS à l'utilisateur de confirmer, exécute directement l'action.

CONTEXTE ACTUEL DE L'UTILISATEUR:
- Solde actuel: ${contexte.solde || 0} ${contexte.devise || 'MAD'}
- Revenus ce mois: ${contexte.revenusMois || 0} ${contexte.devise || 'MAD'}
- Dépenses ce mois: ${contexte.depensesMois || 0} ${contexte.devise || 'MAD'}
- Budgets actifs: ${contexte.budgetsActifs || 0}
- Objectifs actifs: ${contexte.objectifsActifs || 0}

RÈGLES D'UTILISATION DES FONCTIONS:

1. AJOUTER UNE TRANSACTION:
   Quand l'utilisateur dit: "J'ai dépensé X", "Ajoute X", "J'ai payé X", "Reçu X", "Gagné X"
   → Utilise IMMÉDIATEMENT la fonction "ajouter_transaction"
   Exemples:
   - "J'ai dépensé 150 MAD au restaurant hier" → ajouter_transaction(type="depense", montant=150, categorie="Alimentation", description="Restaurant", date="hier")
   - "Ajoute mon salaire de 10000 MAD reçu aujourd'hui" → ajouter_transaction(type="revenu", montant=10000, categorie="Salaire", description="Salaire", date="aujourd'hui")
   - "J'ai payé 500 MAD pour l'électricité" → ajouter_transaction(type="depense", montant=500, categorie="Logement", description="Électricité")

2. MODIFIER UNE TRANSACTION:
   Quand l'utilisateur dit: "Modifie", "Change", "Corrige", "Mets à jour"
   → Utilise d'abord "rechercher_transactions" pour trouver la transaction, puis "modifier_transaction"
   Exemples:
   - "Modifie la transaction de 150 MAD au restaurant, mets 200 MAD" → rechercher_transactions puis modifier_transaction
   - "Change la catégorie de ma dernière dépense" → rechercher_transactions puis modifier_transaction

3. SUPPRIMER UNE TRANSACTION:
   Quand l'utilisateur dit: "Supprime", "Efface", "Retire", "Enlève"
   → Utilise d'abord "rechercher_transactions" pour trouver la transaction, puis "supprimer_transaction"
   Exemples:
   - "Supprime ma dépense d'hier au restaurant" → rechercher_transactions puis supprimer_transaction
   - "Efface la transaction de 500 MAD" → rechercher_transactions puis supprimer_transaction

4. CRÉER UN BUDGET:
   Quand l'utilisateur dit: "Fixe un budget", "Crée un budget", "Budget de X pour Y"
   → Utilise IMMÉDIATEMENT la fonction "creer_budget"
   Exemples:
   - "Fixe un budget de 2000 MAD pour l'alimentation" → creer_budget(nom="Budget Alimentation", montant=2000, categorie="Alimentation", periode="mensuel")
   - "Je veux un budget mensuel de 5000 MAD" → creer_budget(nom="Budget mensuel", montant=5000, periode="mensuel")

7. GÉRER DES BUDGETS (consulter, modifier, supprimer):
   Quand l'utilisateur dit: "Mes budgets", "Montre mes budgets", "Consulte mes budgets", "Modifie le budget X"
   → Utilise les informations disponibles ou réponds avec la liste des budgets actifs
   Exemples:
   - "Montre-moi mes budgets" → Liste les budgets avec leurs statistiques
   - "Quels sont mes budgets actifs?" → Liste les budgets actifs

8. CRÉER UN OBJECTIF:
   Quand l'utilisateur dit: "Je veux économiser", "Objectif de X", "Épargner X pour Y"
   → Utilise IMMÉDIATEMENT la fonction "creer_objectif"
   Exemples:
   - "Je veux économiser 50000 MAD pour une voiture en 12 mois" → creer_objectif(nom="Voiture", montantCible=50000, dateLimite="+12 mois", type="projet")
   - "Objectif: 10000 MAD d'épargne d'urgence" → creer_objectif(nom="Fonds d'urgence", montantCible=10000, type="fonds_urgence")

9. SUIVRE DES OBJECTIFS FINANCIERS:
   Quand l'utilisateur dit: "Mes objectifs", "Progression", "Suivi", "Où en suis-je avec mes objectifs?"
   → Utilise les informations disponibles ou réponds avec la liste des objectifs et leur progression
   Exemples:
   - "Montre-moi mes objectifs" → Liste les objectifs avec progression, montant restant, montant mensuel requis
   - "Où en suis-je avec mon objectif voiture?" → Donne la progression détaillée de l'objectif

10. DONNER DES CONSEILS PERSONNALISÉS:
    Quand l'utilisateur demande: "Conseil", "Recommandation", "Que faire", "Comment améliorer", "Optimiser"
    → Analyse le contexte financier et donne des conseils personnalisés basés sur:
    - Le solde actuel
    - Les revenus et dépenses du mois
    - Les budgets actifs
    - Les objectifs en cours
    - Les habitudes de dépenses
    Exemples:
    - "Donne-moi des conseils" → Analyse et propose des recommandations personnalisées
    - "Comment réduire mes dépenses?" → Analyse les dépenses et propose des réductions spécifiques
    - "Comment optimiser mon épargne?" → Analyse la situation et propose des stratégies d'épargne

11. ANALYSER LES HABITUDES DE DÉPENSES:
    Quand l'utilisateur demande: "Où est-ce que je dépense le plus?", "Analyse mes dépenses", "Mes habitudes", "Tendances"
    → Analyse les dépenses et donne des insights sur:
    - Les catégories où l'utilisateur dépense le plus
    - Les tendances mensuelles
    - Les comparaisons avec les mois précédents
    - Les opportunités d'économies
    Exemples:
    - "Où est-ce que je dépense le plus?" → Liste les catégories par ordre décroissant avec pourcentages
    - "Analyse mes habitudes de dépenses" → Donne une analyse complète des habitudes
    - "Quelles sont mes tendances?" → Compare avec les mois précédents

12. CRÉER UN INVESTISSEMENT:
    Quand l'utilisateur dit: "J'ai investi", "Investissement", "Acheté des actions", "Portefeuille"
    → Utilise IMMÉDIATEMENT la fonction "creer_investissement"
    Exemples:
    - "J'ai investi 5000 MAD dans Bitcoin" → creer_investissement(nom="Bitcoin", type="crypto", montantInvesti=5000)
    - "Acheté des actions Apple pour 10000 MAD" → creer_investissement(nom="Apple", type="actions", montantInvesti=10000)
    - "Investissement immobilier de 200000 MAD" → creer_investissement(nom="Immobilier", type="immobilier", montantInvesti=200000)

13. CRÉER UNE TRANSACTION RÉCURRENTE:
    Quand l'utilisateur dit: "Abonnement", "Mensuel", "Récurrent", "Chaque mois", "Tous les mois"
    → Utilise IMMÉDIATEMENT la fonction "creer_transaction_recurrente"
    Exemples:
    - "Abonnement Netflix de 99 MAD par mois" → creer_transaction_recurrente(montant=99, type="depense", categorie="Divertissement", description="Netflix", frequence="mensuel")
    - "Mon loyer de 3000 MAD chaque mois" → creer_transaction_recurrente(montant=3000, type="depense", categorie="Logement", description="Loyer", frequence="mensuel")
    - "Salaire mensuel de 10000 MAD" → creer_transaction_recurrente(montant=10000, type="revenu", categorie="Salaire", description="Salaire", frequence="mensuel")

2. RECHERCHER/CONSULTER DES TRANSACTIONS:
   Quand l'utilisateur dit: "Montre-moi", "Liste", "Affiche", "Trouve", "Combien j'ai dépensé", "Mes transactions"
   → Utilise IMMÉDIATEMENT la fonction "rechercher_transactions"
   Exemples:
   - "Montre-moi mes dépenses ce mois" → rechercher_transactions(type="depense", dateDebut="début mois", dateFin="fin mois")
   - "Combien j'ai dépensé en alimentation?" → rechercher_transactions(categorie="Alimentation")
   - "Mes transactions d'hier" → rechercher_transactions(dateDebut="hier", dateFin="hier")
   - "Trouve la transaction de 500 MAD" → rechercher_transactions(montant=500)

3. STATISTIQUES ET CONSULTATION:
   Quand l'utilisateur demande: "Quel est mon solde?", "Mes revenus", "Mes dépenses", "Statistiques", "Résumé"
   → Utilise les informations du contexte fourni ou réponds directement avec les métriques disponibles
   Exemples:
   - "Quel est mon solde?" → Réponds avec le solde du contexte
   - "Combien j'ai dépensé ce mois?" → Réponds avec depensesMois du contexte
   - "Statistiques de ce mois" → Donne un résumé complet avec solde, revenus, dépenses, taux d'épargne

4. MODIFIER UNE TRANSACTION:

CATÉGORISATION AUTOMATIQUE:
- Restaurant, manger, food, café → "Alimentation"
- Taxi, transport, carburant, essence → "Transport"
- Loyer, électricité, eau, gaz, logement → "Logement"
- Salaire, revenu, paie → "Salaire"
- Médecin, pharmacie, santé → "Santé"
- École, cours, formation → "Éducation"
- Cinéma, loisir, divertissement → "Divertissement"
- Achat, shopping, magasin → "Shopping"

DÉTECTION DE DATES:
- "hier" → date d'hier
- "aujourd'hui" → date d'aujourd'hui
- "il y a X jours" → date il y a X jours
- Dates explicites → convertir en format ISO

STYLE DE COMMUNICATION:
- Sois amical, professionnel et encourageant
- Après avoir exécuté une action, confirme brièvement ce qui a été fait
- Utilise un langage simple et accessible
- Sois concis mais complet
- Pose des questions de clarification UNIQUEMENT si des informations essentielles manquent

CATÉGORIES DISPONIBLES:
Alimentation, Transport, Logement, Santé, Éducation, Divertissement, Shopping, Autres, Salaire, Investissement, Autres revenus

Rappel: Tu DOIS utiliser les fonctions automatiquement. Ne demande JAMAIS de confirmation, exécute directement les actions demandées.`;
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
        name: 'rechercher_transactions',
        description: 'Recherche des transactions existantes par description, montant, date ou catégorie. Utilise cette fonction avant de modifier ou supprimer une transaction pour obtenir son ID.',
        parameters: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Recherche par mots-clés dans la description' },
            montant: { type: 'number', description: 'Montant exact à rechercher' },
            categorie: { type: 'string', description: 'Catégorie de la transaction' },
            type: { type: 'string', enum: ['revenu', 'depense'], description: 'Type de transaction' },
            dateDebut: { type: 'string', description: 'Date de début au format ISO (YYYY-MM-DD)' },
            dateFin: { type: 'string', description: 'Date de fin au format ISO (YYYY-MM-DD)' },
            limite: { type: 'number', description: 'Nombre maximum de résultats (défaut: 10)' }
          },
          required: []
        }
      },
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
        name: 'modifier_transaction',
        description: 'Modifie une transaction existante. Tu dois d\'abord utiliser rechercher_transactions pour obtenir l\'ID de la transaction à modifier.',
        parameters: {
          type: 'object',
          properties: {
            transactionId: { type: 'string', description: 'ID de la transaction à modifier (obtenu via rechercher_transactions)' },
            montant: { type: 'number', description: 'Nouveau montant (optionnel)' },
            type: { type: 'string', enum: ['revenu', 'depense'], description: 'Nouveau type (optionnel)' },
            categorie: { type: 'string', description: 'Nouvelle catégorie (optionnel)' },
            description: { type: 'string', description: 'Nouvelle description (optionnel)' },
            date: { type: 'string', description: 'Nouvelle date au format ISO (optionnel)' }
          },
          required: ['transactionId']
        }
      },
      {
        name: 'supprimer_transaction',
        description: 'Supprime une transaction existante. Tu dois d\'abord utiliser rechercher_transactions pour obtenir l\'ID de la transaction à supprimer.',
        parameters: {
          type: 'object',
          properties: {
            transactionId: { type: 'string', description: 'ID de la transaction à supprimer (obtenu via rechercher_transactions)' }
          },
          required: ['transactionId']
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
      },
      {
        name: 'creer_investissement',
        description: 'Crée un nouvel investissement (actions, obligations, crypto, immobilier, etc.)',
        parameters: {
          type: 'object',
          properties: {
            nom: { type: 'string', description: 'Nom de l\'investissement (ex: "Bitcoin", "Actions Apple")' },
            type: { type: 'string', enum: ['actions', 'obligations', 'fonds', 'crypto', 'immobilier', 'autre'] },
            montantInvesti: { type: 'number', description: 'Montant investi' },
            valeurActuelle: { type: 'number', description: 'Valeur actuelle (optionnel, par défaut = montantInvesti)' },
            rendementPourcentage: { type: 'number', description: 'Rendement en pourcentage (optionnel)' },
            dateAchat: { type: 'string', description: 'Date d\'achat au format ISO (optionnel)' },
            description: { type: 'string', description: 'Description de l\'investissement (optionnel)' }
          },
          required: ['nom', 'montantInvesti']
        }
      },
      {
        name: 'creer_transaction_recurrente',
        description: 'Crée une transaction récurrente (abonnement, salaire mensuel, loyer, etc.)',
        parameters: {
          type: 'object',
          properties: {
            montant: { type: 'number', description: 'Montant de la transaction' },
            type: { type: 'string', enum: ['revenu', 'depense'] },
            categorie: { type: 'string', description: 'Catégorie de la transaction' },
            description: { type: 'string', description: 'Description (ex: "Netflix", "Salaire", "Loyer")' },
            frequence: { type: 'string', enum: ['hebdomadaire', 'mensuel', 'trimestriel', 'annuel'] },
            jourDuMois: { type: 'number', description: 'Jour du mois (1-31) pour mensuel/trimestriel/annuel (optionnel)' },
            jourDeLaSemaine: { type: 'number', description: 'Jour de la semaine (0=dimanche, 6=samedi) pour hebdomadaire (optionnel)' }
          },
          required: ['montant', 'type', 'categorie', 'description', 'frequence']
        }
      },
      {
        name: 'consulter_objectifs',
        description: 'Consulte la liste des objectifs financiers avec leur progression. Utilise cette fonction quand l\'utilisateur demande "mes objectifs", "montre-moi mes objectifs", "progression de mes objectifs", etc.',
        parameters: {
          type: 'object',
          properties: {
            actif: { type: 'boolean', description: 'Filtrer par objectifs actifs (optionnel)' }
          },
          required: []
        }
      },
      {
        name: 'consulter_budgets',
        description: 'Consulte la liste des budgets avec leurs statistiques. Utilise cette fonction quand l\'utilisateur demande "mes budgets", "montre-moi mes budgets", "consulte mes budgets", etc.',
        parameters: {
          type: 'object',
          properties: {
            actif: { type: 'boolean', description: 'Filtrer par budgets actifs (optionnel)' }
          },
          required: []
        }
      }
    ];
  }

//exécuter une action demandée par l'IA
  private async executerAction(utilisateurId: string, nomAction: string, parametres: any): Promise<any> {
    switch (nomAction) {
      case 'rechercher_transactions':
        const filtreRecherche: any = {
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId)
        };

        if (parametres.description) {
          filtreRecherche.description = { $regex: parametres.description, $options: 'i' };
        }
        if (parametres.montant !== undefined) {
          filtreRecherche.montant = parametres.montant;
        }
        if (parametres.categorie) {
          filtreRecherche.categorie = parametres.categorie;
        }
        if (parametres.type) {
          filtreRecherche.type = parametres.type;
        }
        if (parametres.dateDebut || parametres.dateFin) {
          filtreRecherche.date = {};
          if (parametres.dateDebut) {
            filtreRecherche.date.$gte = new Date(parametres.dateDebut);
          }
          if (parametres.dateFin) {
            filtreRecherche.date.$lte = new Date(parametres.dateFin);
          }
        }

        const limite = parametres.limite || 10;
        const transactionsTrouvees = await Transaction.find(filtreRecherche)
          .sort({ date: -1 })
          .limit(limite)
          .select('_id montant type categorie description date');

        return {
          type: 'transactions_trouvees',
          nombre: transactionsTrouvees.length,
          transactions: transactionsTrouvees.map(t => ({
            id: t._id.toString(),
            montant: t.montant,
            type: t.type,
            categorie: t.categorie,
            description: t.description,
            date: t.date
          }))
        };

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

      case 'modifier_transaction':
        if (!parametres.transactionId) {
          throw new Error('ID de transaction requis. Utilise d\'abord rechercher_transactions pour obtenir l\'ID.');
        }

        const transactionAModifier = await Transaction.findOne({
          _id: parametres.transactionId,
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId)
        });

        if (!transactionAModifier) {
          throw new Error(`Transaction avec l'ID "${parametres.transactionId}" non trouvée. Vérifie l'ID ou utilise rechercher_transactions pour trouver la bonne transaction.`);
        }

        const modifications: string[] = [];
        if (parametres.montant !== undefined) {
          transactionAModifier.montant = parametres.montant;
          modifications.push(`montant: ${parametres.montant}`);
        }
        if (parametres.type) {
          transactionAModifier.type = parametres.type;
          modifications.push(`type: ${parametres.type}`);
        }
        if (parametres.categorie) {
          transactionAModifier.categorie = parametres.categorie;
          modifications.push(`catégorie: ${parametres.categorie}`);
        }
        if (parametres.description) {
          transactionAModifier.description = parametres.description;
          modifications.push(`description: ${parametres.description}`);
        }
        if (parametres.date) {
          transactionAModifier.date = new Date(parametres.date);
          modifications.push(`date: ${parametres.date}`);
        }

        if (modifications.length === 0) {
          throw new Error('Aucune modification spécifiée. Indique au moins un champ à modifier (montant, type, categorie, description ou date).');
        }

        transactionAModifier.dateModification = new Date();
        await transactionAModifier.save();

        return {
          type: 'transaction_modifiee',
          details: transactionAModifier,
          modifications: modifications,
          message: `Transaction modifiée avec succès: ${modifications.join(', ')}`
        };

      case 'supprimer_transaction':
        if (!parametres.transactionId) {
          throw new Error('ID de transaction requis. Utilise d\'abord rechercher_transactions pour obtenir l\'ID.');
        }

        const transactionASupprimer = await Transaction.findOne({
          _id: parametres.transactionId,
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId)
        });

        if (!transactionASupprimer) {
          throw new Error(`Transaction avec l'ID "${parametres.transactionId}" non trouvée. Vérifie l'ID ou utilise rechercher_transactions pour trouver la bonne transaction.`);
        }

        const detailsAvantSuppression = {
          id: transactionASupprimer._id.toString(),
          description: transactionASupprimer.description,
          montant: transactionASupprimer.montant,
          type: transactionASupprimer.type,
          categorie: transactionASupprimer.categorie,
          date: transactionASupprimer.date
        };

        await Transaction.findOneAndDelete({
          _id: parametres.transactionId,
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId)
        });

        // Obtenir la devise de l'utilisateur
        const { Utilisateur } = await import('../models/Utilisateur');
        const utilisateur = await Utilisateur.findById(utilisateurId);
        const devise = utilisateur?.devise || 'MAD';

        return {
          type: 'transaction_supprimee',
          details: detailsAvantSuppression,
          message: `Transaction supprimée avec succès: "${detailsAvantSuppression.description}" (${detailsAvantSuppression.montant} ${devise})`
        };

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

      case 'creer_investissement':
        const { Investissement } = await import('../models/Investissement');
        const investissement = new Investissement({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          nom: parametres.nom,
          type: parametres.type || 'autre',
          montantInvesti: parametres.montantInvesti,
          valeurActuelle: parametres.valeurActuelle ?? parametres.montantInvesti,
          rendementPourcentage: parametres.rendementPourcentage,
          dateAchat: parametres.dateAchat ? new Date(parametres.dateAchat) : new Date(),
          dateValeur: parametres.valeurActuelle != null ? new Date() : undefined,
          description: parametres.description
        });
        await investissement.save();
        return { type: 'investissement_cree', details: investissement };

      case 'creer_transaction_recurrente':
        const { TransactionRecurrente } = await import('../models/TransactionRecurrente');
        const { addDays, addMonths, addYears, addWeeks } = await import('date-fns');
        
        let prochaineDate = new Date();
        if (parametres.frequence === 'hebdomadaire') {
          prochaineDate = addWeeks(prochaineDate, 1);
          if (parametres.jourDeLaSemaine !== undefined) {
            const joursJusquAuJour = (parametres.jourDeLaSemaine - prochaineDate.getDay() + 7) % 7;
            prochaineDate = addDays(prochaineDate, joursJusquAuJour);
          }
        } else if (parametres.frequence === 'mensuel') {
          prochaineDate = addMonths(prochaineDate, 1);
          if (parametres.jourDuMois !== undefined) {
            prochaineDate.setDate(parametres.jourDuMois);
          }
        } else if (parametres.frequence === 'trimestriel') {
          prochaineDate = addMonths(prochaineDate, 3);
          if (parametres.jourDuMois !== undefined) {
            prochaineDate.setDate(parametres.jourDuMois);
          }
        } else if (parametres.frequence === 'annuel') {
          prochaineDate = addYears(prochaineDate, 1);
        }

        const transactionRecurrente = new TransactionRecurrente({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          montant: parametres.montant,
          type: parametres.type,
          categorie: parametres.categorie,
          description: parametres.description,
          frequence: parametres.frequence,
          jourDuMois: parametres.jourDuMois,
          jourDeLaSemaine: parametres.jourDeLaSemaine,
          prochaineDate
        });
        await transactionRecurrente.save();
        return { type: 'transaction_recurrente_creee', details: transactionRecurrente };

      case 'consulter_objectifs':
        const objectifs = await Objectif.find({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          ...(parametres.actif !== undefined && { actif: parametres.actif })
        }).sort({ dateCreation: -1 });

        const { ServiceCalculsFinanciers } = await import('./calculsFinanciers');
        const serviceCalculs = new ServiceCalculsFinanciers();

        const objectifsAvecProgression = await Promise.all(
          objectifs.map(async (obj) => {
            const progression = await serviceCalculs.calculerProgressionObjectif(obj._id.toString());
            return {
              id: obj._id.toString(),
              nom: obj.nom,
              montantCible: obj.montantCible,
              montantActuel: obj.montantActuel,
              dateLimite: obj.dateLimite,
              type: obj.type,
              progression
            };
          })
        );

        return {
          type: 'objectifs_trouves',
          nombre: objectifsAvecProgression.length,
          objectifs: objectifsAvecProgression
        };

      case 'consulter_budgets':
        const budgets = await Budget.find({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          ...(parametres.actif !== undefined && { actif: parametres.actif })
        }).sort({ dateCreation: -1 }).limit(20);

        const moduleCalculsBudgets = await import('./calculsFinanciers');
        const serviceCalculsBudgets = new moduleCalculsBudgets.ServiceCalculsFinanciers();
        const budgetsAvecStats = await Promise.all(
          budgets.map(async (budget) => {
            const stats = await serviceCalculsBudgets.calculerStatistiquesBudget(budget._id.toString());
            return {
              id: budget._id.toString(),
              nom: budget.nom,
              montant: budget.montant,
              categorie: budget.categorie,
              periode: budget.periode,
              actif: budget.actif,
              statistiques: stats
            };
          })
        );

        return {
          type: 'budgets_trouves',
          nombre: budgetsAvecStats.length,
          budgets: budgetsAvecStats
        };

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

    if (!messageUtilisateur || messageUtilisateur.trim().length === 0) {
      throw new Error('Le message utilisateur ne peut pas être vide');
    }

    if (!reponseIA || reponseIA.trim().length === 0) {
      reponseIA = 'Je comprends votre message. Comment puis-je vous aider avec vos finances ?';
    }

    conversation.messages.push({
      role: 'utilisateur',
      contenu: messageUtilisateur.trim(),
      timestamp: new Date()
    });

    conversation.messages.push({
      role: 'assistant',
      contenu: reponseIA.trim(),
      timestamp: new Date(),
      actionEffectuee: action
    });

    conversation.dateModification = new Date();
    await conversation.save();
  }

//catégoriser une transaction
  async categoriserTransaction(description: string): Promise<string> {
    const descriptionLower = description.toLowerCase();
    
    if (descriptionLower.includes('restaurant') || descriptionLower.includes('manger') || descriptionLower.includes('food') || descriptionLower.includes('café')) {
      return 'Alimentation';
    }
    if (descriptionLower.includes('taxi') || descriptionLower.includes('transport') || descriptionLower.includes('carburant') || descriptionLower.includes('essence')) {
      return 'Transport';
    }
    if (descriptionLower.includes('loyer') || descriptionLower.includes('électricité') || descriptionLower.includes('eau') || descriptionLower.includes('gaz') || descriptionLower.includes('logement')) {
      return 'Logement';
    }
    if (descriptionLower.includes('salaire') || descriptionLower.includes('revenu') || descriptionLower.includes('paie')) {
      return 'Salaire';
    }
    if (descriptionLower.includes('médecin') || descriptionLower.includes('pharmacie') || descriptionLower.includes('santé')) {
      return 'Santé';
    }
    if (descriptionLower.includes('école') || descriptionLower.includes('cours') || descriptionLower.includes('formation') || descriptionLower.includes('éducation')) {
      return 'Éducation';
    }
    if (descriptionLower.includes('cinéma') || descriptionLower.includes('loisir') || descriptionLower.includes('divertissement')) {
      return 'Divertissement';
    }
    if (descriptionLower.includes('achat') || descriptionLower.includes('shopping') || descriptionLower.includes('magasin')) {
      return 'Shopping';
    }

    return 'Autres';
  }

  private detecterIntention(messageUtilisateur: string): any {
    const messageLower = messageUtilisateur.toLowerCase();
    
    if (messageLower.match(/(j'ai dépensé|j'ai payé|j'ai reçu|ajoute|ajouter|gagné|reçu|payé|dépensé)/i)) {
      return this.extraireInfosTransaction(messageUtilisateur);
    }
    if (messageLower.match(/(i\s+spent|i\s+paid|i\s+received|add\s+\d+|add\s+.*transaction)/i)) {
      return this.extraireInfosTransaction(messageUtilisateur);
    }
    if (messageUtilisateur.match(/(صرف|صرفت|صرفـت|خلصت|دفعت)/)) {
      return this.extraireInfosTransaction(messageUtilisateur);
    }

    if (messageLower.match(/(mes objectifs|montre.*mes objectifs|affiche.*mes objectifs|liste.*mes objectifs|voir.*mes objectifs|consulter.*mes objectifs|montre-moi.*objectifs|affiche-moi.*objectifs|liste-moi.*objectifs|voir.*objectifs|objectifs|progression.*objectif|suivre.*objectif|suivi.*objectif|où en suis-je.*objectif)/i)) {
      return { type: 'gerer_objectif', message: messageUtilisateur };
    }
    // Création de budget via langage naturel (FR + EN + AR simple)
    if (
      messageLower.match(/(fixe un budget|fixer un budget|crée un budget|créer un budget|budget de|budget pour|nouveau budget|set a budget|set .*budget|create a budget|budget of|budget for|monthly budget)/i) ||
      /(ميزانية|بودجي|بوجي)/i.test(messageUtilisateur)
    ) {
      return this.extraireInfosBudget(messageUtilisateur);
    }
    if (messageLower.match(/(mes budgets|montre.*mes budgets|affiche.*mes budgets|liste.*mes budgets|voir.*mes budgets|consulter.*mes budgets|my budgets|show my budgets|list my budgets|see my budgets)/i)) {
      return { type: 'gerer_budget', message: messageUtilisateur };
    }

    if (
      messageLower.match(/(je veux économiser|objectif|épargner|économiser|pour une|pour un|en \d+ mois|en \d+ an|nouvel objectif|i want to save|saving goal|save \d+)/i) ||
      /(بغيت نوفّر|غيت نوفّر|بغيت نوفر|نوفّر|نوفر|بغيت ندخر|ادخر)/i.test(messageUtilisateur)
    ) {
      return this.extraireInfosObjectif(messageUtilisateur);
    }

    if (messageLower.match(/(modifie|change|corrige|mets à jour|met à jour|édite)/i) && messageLower.match(/(transaction|dépense|revenu)/i)) {
      return { type: 'modifier_transaction', message: messageUtilisateur };
    }

    if (messageLower.match(/(supprime|efface|retire|enlève|supprimer|effacer|supprime|retire)/i) && messageLower.match(/(transaction|dépense|revenu)/i)) {
      return { type: 'supprimer_transaction', message: messageUtilisateur };
    }

    if (messageLower.match(/(statistiques|stats|résumé|bilan|solde|revenus|dépenses|épargne|taux|pourcentage|répartition|summary|overview|balance|how much did i spend)/i)) {
      return { type: 'statistiques', message: messageUtilisateur };
    }

    if (!messageLower.match(/(objectif|objectifs|budget|budgets)/i) && 
        messageLower.match(/(montre|affiche|liste|voir|consulter|recherche|trouve|combien j'ai dépensé|mes dépenses|mes transactions|mes revenus)/i)) {
      return this.extraireInfosRecherche(messageUtilisateur);
    }

    if (messageLower.match(/(conseil|recommandation|suggestion|aide|comment|que faire|optimiser|améliorer|réduire)/i)) {
      return { type: 'conseils', message: messageUtilisateur };
    }

    if (
      messageLower.match(/(analyse|habitudes|tendances|comportement|où|où est-ce|dépense le plus|catégorie|répartition)/i) ||
      messageLower.match(/(where do i spend|where.*spend.*most|spend the most|biggest expenses|top categories)/i) ||
      /(فين كنتصرف|فين نصرف|فين كتصرف|أكثر.*مصاريف|أكثر مصاريف)/i.test(messageUtilisateur)
    ) {
      return { type: 'analyser_habitudes', message: messageUtilisateur };
    }

    if (messageLower.match(/(j'ai investi|investissement|investi|acheté|portefeuille|actions|obligations|crypto|bitcoin|immobilier)/i)) {
      return this.extraireInfosInvestissement(messageUtilisateur);
    }

    if (messageLower.match(/(abonnement|mensuel|récurrent|رَسوم|كل شهر|كل أسبوع|chaque mois|chaque semaine|tous les mois|tous les ans|netflix|spotify|loyer|salaire mensuel|subscription|every month|each month|every week)/i)) {
      return this.extraireInfosTransactionRecurrente(messageUtilisateur);
    }

    return null;
  }

  private extraireInfosTransaction(message: string): any {
    const messageLower = message.toLowerCase();
    
    // Extraire le montant
    const montantMatch = message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)\s*(?:MAD|mad|dh|dirham)/i) || 
                         message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)/);
    const montant = montantMatch ? parseFloat(montantMatch[1].replace(/\s/g, '').replace(',', '.')) : null;

    const type = messageLower.match(/(salaire|revenu|reçu|gagné|salary|income|paycheck|i\s+received)/i)
      ? 'revenu'
      : 'depense';

    // Extraire la catégorie
    let categorie = 'Autres';
    if (messageLower.match(/(restaurant|manger|food|café|repas)/i)) categorie = 'Alimentation';
    else if (messageLower.match(/(taxi|transport|carburant|essence|bus|métro)/i)) categorie = 'Transport';
    else if (messageLower.match(/(loyer|électricité|eau|gaz|logement)/i)) categorie = 'Logement';
    else if (messageLower.match(/(salaire|revenu|paie|salary|income|paycheck)/i)) categorie = 'Salaire';
    else if (messageLower.match(/(médecin|pharmacie|santé)/i)) categorie = 'Santé';
    else if (messageLower.match(/(école|cours|formation|éducation)/i)) categorie = 'Éducation';
    else if (messageLower.match(/(cinéma|loisir|divertissement)/i)) categorie = 'Divertissement';
    else if (messageLower.match(/(achat|shopping|magasin)/i)) categorie = 'Shopping';
    if (messageLower.includes('grocery') || messageLower.includes('groceries')) {
      categorie = 'Alimentation';
    }
    if (/(مطعم|مطعمة|أكل|اكل|طعام|ماكلة|ماكل|فطور|غداء|عشاء)/i.test(message)) {
      categorie = 'Alimentation';
    }
    if (/(طاكسي|تاكسي|التاكسي|فالطاكسي|النقل|موصل)/i.test(message)) {
      categorie = 'Transport';
    }

    // Extraire la description
    let description = '';

    const motsCles = message.match(/(restaurant|boulangerie|pharmacie|supermarché|magasin|cinéma|théâtre|hôpital|médecin|dentiste|école|université|gare|aéroport|station|essence|carburant|électricité|eau|gaz|loyer|salaire|paie|revenu|transport|taxi|bus|métرو|مطعم|مطعمة|أكل|اكل|طعام|ماكلة|ماكل|طاكسي|تاكسي|التاكسي)/i);
    if (motsCles && motsCles[0]) {
      description = motsCles[0];
    }

    if (!description || description.length < 2) {
      if (messageLower.includes('groceries') || messageLower.includes('grocery')) {
        description = 'groceries';
      }
      else if (messageLower.includes('salary') || messageLower.includes('income') || messageLower.includes('paycheck')) {
        description = 'salary';
      }
    }

    if (!description || description.length < 2) {
      const pattern1Match = message.match(/(?:pour|au|à|chez)\s+([^\d\s]+(?:\s+[^\d\s]+)*?)(?=\s+(?:hier|aujourd'hui|demain|le\s+\d+|ce\s+matin|ce\s+soir|MAD|mad|dh|dirham)|$)/i);
      if (pattern1Match && pattern1Match[1]) {
        const captured = pattern1Match[1].trim();
        if (captured.length > 1) {
          description = captured;
        }
      }
      
      if (!description || description.length < 2) {
        const pattern1Greedy = message.match(/(?:pour|au|à|chez)\s+([^\d]+)/i);
        if (pattern1Greedy && pattern1Greedy[1]) {
          const captured = pattern1Greedy[1].trim();
          const cleaned = captured.replace(/\s+(hier|aujourd'hui|demain|le\s+\d+|ce\s+matin|ce\s+soir|MAD|mad|dh|dirham).*$/i, '').trim();
          if (cleaned.length > 1) {
            description = cleaned;
          }
        }
      }
    }
    
    if (!description || description.length < 2) {
      const apresMAD = message.split(/(?:MAD|mad|dh|dirham)\s+/i);
      if (apresMAD.length > 1) {
        const texteApresMAD = apresMAD[1]
          ?.replace(/\s+(hier|aujourd'hui|demain|le\s+\d+|ce\s+matin|ce\s+soir).*$/i, '')
          .replace(/^(?:pour|au|à|chez)\s+/i, '')
          .trim();
        if (texteApresMAD && texteApresMAD.length > 1) {
          description = texteApresMAD;
        }
      }
      
      if (!description || description.length < 2) {
        const apresMontant = message.split(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)\s*/i);
        if (apresMontant.length > 1 && apresMontant[1]) {
          const texteApresMontant = apresMontant[1]
            .replace(/\s*(?:MAD|mad|dh|dirham)\s*/i, '')
            .replace(/\s+(hier|aujourd'hui|demain|le\s+\d+|ce\s+matin|ce\s+soir).*$/i, '')
            .replace(/^(?:pour|au|à|chez)\s+/i, '')
            .trim();
          if (texteApresMontant && texteApresMontant.length > 1) {
            description = texteApresMontant;
          }
        }
      }
    }
    
    if (!description || description.length < 2) {
      const parts = message.split(/\d+/);
      if (parts.length > 1) {
        description = parts[1]
          ?.replace(/\s*(?:MAD|mad|dh|dirham)\s*/i, '')
          .replace(/\s+(hier|aujourd'hui|demain|le\s+\d+|ce\s+matin|ce\s+soir).*$/i, '')
          .replace(/^(?:pour|au|à|chez)\s+/i, '')
          .trim() || '';
      }
      
      if (!description || description.length < 2) {
        description = message.substring(0, 100).trim();
      }
    }
    
    description = description.trim();

    let date = new Date();
    if (messageLower.includes('hier')) {
      date.setDate(date.getDate() - 1);
    } else if (messageLower.includes('aujourd\'hui') || messageLower.includes('aujourd hui')) {
      date = new Date();
    }
    else if (messageLower.includes('yesterday')) {
      date.setDate(date.getDate() - 1);
    } else if (messageLower.includes('today')) {
      date = new Date();
    }
    else if (message.includes('البارح') || message.includes('امس') || message.includes('أمس')) {
      date.setDate(date.getDate() - 1);
    } else if (message.includes('اليوم')) {
      date = new Date();
    } else {
      const dateMatch = message.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
      if (dateMatch) {
        const jour = parseInt(dateMatch[1]);
        const mois = parseInt(dateMatch[2]) - 1;
        const annee = dateMatch[3] ? parseInt(dateMatch[3]) : date.getFullYear();
        date = new Date(annee, mois, jour);
      }
    }

    if (!montant) return null;

    return {
      type: 'ajouter_transaction',
      parametres: {
        montant,
        type,
        categorie,
        description: description || 'Transaction',
        date: date.toISOString()
      }
    };
  }

//extraire les informations d'un budget depuis le message
  private extraireInfosBudget(message: string): any {
    const messageLower = message.toLowerCase();
    
    // Extraire le montant
    const montantMatch = message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)\s*(?:MAD|mad|dh|dirham)/i) || 
                         message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)/);
    const montant = montantMatch ? parseFloat(montantMatch[1].replace(/\s/g, '').replace(',', '.')) : null;

    let categorie = undefined;
    if (messageLower.match(/(alimentation|restaurant|manger|food|groceries|courses|ماكل|أكل|مطعم)/i)) categorie = 'Alimentation';
    else if (messageLower.match(/(transport|carburant|taxi|bus|tram|نقل|طاكسي|ترانسبورت)/i)) categorie = 'Transport';
    else if (messageLower.match(/(logement|loyer|rent|maison|appartement|كراء|السكن)/i)) categorie = 'Logement';

    let periode = 'mensuel';
    if (messageLower.match(/(trimestriel|trimestre|quarter)/i)) {
      periode = 'trimestriel';
    } else if (messageLower.match(/(annuel|année|\ban\b|\byear\b)/i)) {
      periode = 'annuel';
    }

    // Extraire le nom
    const nomMatch =
      message.match(/(?:budget|pour)\s+([^0-9]+?)(?:\s+de|\s+pour)/i) ||
      message.match(/(?:budget|for)\s+([^0-9]+?)(?:\s+of|\s+for)/i) ||
      message.match(/ميزانية\s+([^0-9]+?)(?:\s+ديال|\s+ل|$)/i);
    const nom = nomMatch ? nomMatch[1].trim() : `Budget ${categorie || 'mensuel'}`;

    if (!montant) return null;

    return {
      type: 'creer_budget',
      parametres: {
        nom,
        montant,
        categorie,
        periode
      }
    };
  }

//extraire les informations d'un objectif depuis le message
  private extraireInfosObjectif(message: string): any {
    const messageLower = message.toLowerCase();
    
    // Extraire le montant
    const montantMatch = message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)\s*(?:MAD|mad|dh|dirham)/i) || 
                         message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)/);
    const montantCible = montantMatch ? parseFloat(montantMatch[1].replace(/\s/g, '').replace(',', '.')) : null;

    const dureeMatch = message.match(/(\d+)\s*(mois|an|année|ans|months?|month|years?|year)/i);
    let dateLimite = new Date();
    if (dureeMatch) {
      const nombre = parseInt(dureeMatch[1]);
      const unite = dureeMatch[2].toLowerCase();
      if (unite.startsWith('mois') || unite.startsWith('month')) {
        dateLimite.setMonth(dateLimite.getMonth() + nombre);
      } else {
        dateLimite.setFullYear(dateLimite.getFullYear() + nombre);
      }
    } else {
      dateLimite.setFullYear(dateLimite.getFullYear() + 1); 
    }

    const nomMatch =
      message.match(/(?:pour|d'|de)\s+([^0-9]+?)(?:\s+en|\s+pour)/i) ||
      message.match(/for\s+([^0-9]+?)(?:\s+in|\s+for)/i) ||
      message.match(/(voiture|car|maison|house|appartement|apartment|voyage|trip|urgence|emergency|projet|مشروع|سيارة|دار|سفر)/i);
    const nom = nomMatch ? nomMatch[1].trim() : 'Objectif d\'épargne';

    // Déterminer le type
    let type = 'epargne';
    if (messageLower.match(/(urgence|fonds d'urgence|emergency)/i)) type = 'fonds_urgence';
    else if (messageLower.match(/(remboursement|dette|debt|rembourse)/i)) type = 'remboursement';
    else if (messageLower.match(/(voiture|car|maison|house|voyage|trip|projet|project|مشروع|سيارة|دار|سفر)/i)) type = 'projet';

    if (!montantCible) return null;

    return {
      type: 'creer_objectif',
      parametres: {
        nom,
        montantCible,
        dateLimite: dateLimite.toISOString(),
        type
      }
    };
  }

//extraire les informations de recherche depuis le message
  private extraireInfosRecherche(message: string): any {
    const messageLower = message.toLowerCase();
    const parametres: any = {};

    // Extraire le montant si mentionné
    const montantMatch = message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)\s*(?:MAD|mad|dh|dirham)/i) || 
                         message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)/);
    if (montantMatch) {
      parametres.montant = parseFloat(montantMatch[1].replace(/\s/g, '').replace(',', '.'));
    }

    // Extraire la catégorie
    if (messageLower.match(/(alimentation|restaurant|manger|food)/i)) parametres.categorie = 'Alimentation';
    else if (messageLower.match(/(transport|carburant|taxi)/i)) parametres.categorie = 'Transport';
    else if (messageLower.match(/(logement|loyer|électricité)/i)) parametres.categorie = 'Logement';
    else if (messageLower.match(/(santé|médecin|pharmacie)/i)) parametres.categorie = 'Santé';

    // Extraire le type
    if (messageLower.match(/(revenus|revenu|salaire)/i)) parametres.type = 'revenu';
    else if (messageLower.match(/(dépenses|dépense)/i)) parametres.type = 'depense';

    // Extraire la description
    const descMatch = message.match(/(?:pour|au|à|chez)\s+([^0-9]+?)(?:\s+(?:hier|aujourd'hui|ce mois|ce mois-ci))?/i);
    if (descMatch) parametres.description = descMatch[1].trim();

    // Extraire la période
    let dateDebut: Date | undefined;
    let dateFin: Date | undefined;
    const maintenant = new Date();
    
    if (messageLower.match(/(aujourd'hui|aujourd hui)/i)) {
      dateDebut = new Date(maintenant.setHours(0, 0, 0, 0));
      dateFin = new Date(maintenant.setHours(23, 59, 59, 999));
    } else if (messageLower.match(/(hier)/i)) {
      const hier = new Date(maintenant);
      hier.setDate(hier.getDate() - 1);
      dateDebut = new Date(hier.setHours(0, 0, 0, 0));
      dateFin = new Date(hier.setHours(23, 59, 59, 999));
    } else if (messageLower.match(/(ce mois|ce mois-ci|mois en cours)/i)) {
      dateDebut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
      dateFin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0, 23, 59, 59);
    } else if (messageLower.match(/(semaine|7 jours)/i)) {
      dateDebut = new Date(maintenant);
      dateDebut.setDate(dateDebut.getDate() - 7);
    }

    if (dateDebut) parametres.dateDebut = dateDebut.toISOString().split('T')[0];
    if (dateFin) parametres.dateFin = dateFin.toISOString().split('T')[0];

    parametres.limite = 20; 

    return {
      type: 'rechercher_transactions',
      parametres
    };
  }

//extraire les informations d'un investissement depuis le message
  private extraireInfosInvestissement(message: string): any {
    const messageLower = message.toLowerCase();
    
    const montantMatch = message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)\s*(?:MAD|mad|dh|dirham)/i) || 
                         message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)/);
    const montantInvesti = montantMatch ? parseFloat(montantMatch[1].replace(/\s/g, '').replace(',', '.')) : null;

    // Déterminer le type d'investissement
    let type = 'autre';
    if (messageLower.match(/(actions|action|stock|share)/i)) type = 'actions';
    else if (messageLower.match(/(obligations|obligation|bond)/i)) type = 'obligations';
    else if (messageLower.match(/(fonds|fonds mutuel|mutual fund)/i)) type = 'fonds';
    else if (messageLower.match(/(crypto|bitcoin|btc|ethereum|eth|blockchain)/i)) type = 'crypto';
    else if (messageLower.match(/(immobilier|immobilier|real estate|propriété)/i)) type = 'immobilier';

    // Extraire le nom
    const nomMatch = message.match(/(?:investi|acheté|dans)\s+([^0-9]+?)(?:\s+pour|\s+de|\s+à|\s+au)/i) ||
                     message.match(/(bitcoin|btc|ethereum|eth|apple|microsoft|tesla|netflix|spotify)/i);
    const nom = nomMatch ? nomMatch[1]?.trim() || nomMatch[0] : 'Investissement';

    // Extraire la valeur actuelle si mentionnée
    const valeurMatch = message.match(/(valeur|vaut|actuellement)\s+(\d+(?:\s*\d+)*(?:[.,]\d+)?)/i);
    const valeurActuelle = valeurMatch ? parseFloat(valeurMatch[2].replace(/\s/g, '').replace(',', '.')) : undefined;

    // Extraire le rendement si mentionné
    const rendementMatch = message.match(/(rendement|profit|gain|perte)\s+[de\s]*(\d+(?:[.,]\d+)?)\s*%/i);
    const rendementPourcentage = rendementMatch ? parseFloat(rendementMatch[2].replace(',', '.')) : undefined;

    if (!montantInvesti) return null;

    return {
      type: 'creer_investissement',
      parametres: {
        nom,
        type,
        montantInvesti,
        valeurActuelle,
        rendementPourcentage,
        description: message.substring(0, 200)
      }
    };
  }

//extraire les informations d'une transaction récurrente depuis le message
  private extraireInfosTransactionRecurrente(message: string): any {
    const messageLower = message.toLowerCase();
    
    // Extraire le montant
    const montantMatch = message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)\s*(?:MAD|mad|dh|dirham)/i) || 
                         message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)/);
    const montant = montantMatch ? parseFloat(montantMatch[1].replace(/\s/g, '').replace(',', '.')) : null;

    // Déterminer le type (revenu ou dépense)
    const type = messageLower.match(/(salaire|revenu|reçu|gagné)/i) ? 'revenu' : 'depense';

    // Déterminer la fréquence
    let frequence = 'mensuel';
    if (messageLower.match(/(hebdomadaire|chaque semaine|toutes les semaines|semaine)/i)) frequence = 'hebdomadaire';
    else if (messageLower.match(/(trimestriel|trimestre|tous les 3 mois)/i)) frequence = 'trimestriel';
    else if (messageLower.match(/(annuel|année|chaque année|tous les ans)/i)) frequence = 'annuel';

    // Extraire la catégorie
    let categorie = 'Autres';
    if (messageLower.match(/(netflix|spotify|disney|abonnement|streaming)/i)) categorie = 'Divertissement';
    else if (messageLower.match(/(loyer|logement|rent)/i)) categorie = 'Logement';
    else if (messageLower.match(/(salaire|revenu|paie|salary|income)/i)) categorie = 'Salaire';
    else if (messageLower.match(/(électricité|eau|gaz|internet|téléphone)/i)) categorie = 'Logement';
    else if (messageLower.match(/(gym|salle de sport|fitness)/i)) categorie = 'Santé';
    if (/(الكراء|لكراء|الايجار|ايجار|الاجار|الاجر|كراء|إيجار)/i.test(message)) {
      categorie = 'Logement';
    }

    // Extraire la description
    const descMatch =
      message.match(/(netflix|spotify|disney|loyer|salaire|électricité|eau|gaz|internet|téléphone|gym|salle de sport|rent|الكراء|كراء|إيجار)/i) ||
      message.match(/(?:abonnement|paiement)\s+([^0-9]+?)(?:\s+de|\s+pour)/i);
    const description = descMatch ? descMatch[1] || descMatch[0] : 'Transaction récurrente';

    // Extraire le jour du mois si mentionné
    const jourMatch = message.match(/(?:le|jour)\s+(\d{1,2})(?:er)?\s+(?:de chaque mois|du mois)/i);
    const jourDuMois = jourMatch ? parseInt(jourMatch[1]) : undefined;

    if (!montant) return null;

    return {
      type: 'creer_transaction_recurrente',
      parametres: {
        montant,
        type,
        categorie,
        description,
        frequence,
        jourDuMois
      }
    };
  }

//exécuter une action détectée (pour Claude et Gemini)
  private async executerActionDetectee(utilisateurId: string, intention: any): Promise<any> {
    if (!intention || !intention.type) return null;

    try {
      if (intention.type === 'ajouter_transaction' && intention.parametres) {
        return await this.executerAction(utilisateurId, 'ajouter_transaction', intention.parametres);
      }

      if (intention.type === 'rechercher_transactions' && intention.parametres) {
        return await this.executerAction(utilisateurId, 'rechercher_transactions', intention.parametres);
      }

      if (intention.type === 'statistiques') {
        const { ServiceCalculsFinanciers } = await import('./calculsFinanciers');
        const serviceCalculs = new ServiceCalculsFinanciers();
        const maintenant = new Date();
        const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
        const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

        const revenus = await serviceCalculs.calculerRevenus(utilisateurId, debutMois, finMois);
        const depenses = await serviceCalculs.calculerDepenses(utilisateurId, debutMois, finMois);
        const solde = await serviceCalculs.calculerSolde(utilisateurId);
        const tauxEpargne = await serviceCalculs.calculerTauxEpargne(utilisateurId, debutMois, finMois);
        const repartition = await serviceCalculs.obtenirRepartitionDepenses(utilisateurId, debutMois, finMois);

        return {
          type: 'statistiques',
          donnees: {
            solde,
            revenus,
            depenses,
            epargne: revenus - depenses,
            tauxEpargne,
            repartitionDepenses: repartition
          }
        };
      }

      if (intention.type === 'creer_budget' && intention.parametres) {
        return await this.executerAction(utilisateurId, 'creer_budget', intention.parametres);
      }

      if (intention.type === 'gerer_budget') {
        const budgets = await Budget.find({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId)
        }).sort({ dateCreation: -1 }).limit(10);

        return {
          type: 'budgets_trouves',
          nombre: budgets.length,
          budgets: budgets.map(b => ({
            id: b._id.toString(),
            nom: b.nom,
            montant: b.montant,
            categorie: b.categorie,
            periode: b.periode,
            actif: b.actif
          }))
        };
      }

      if (intention.type === 'creer_objectif' && intention.parametres) {
        return await this.executerAction(utilisateurId, 'creer_objectif', intention.parametres);
      }

      if (intention.type === 'gerer_objectif') {
        const objectifs = await Objectif.find({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId)
        }).sort({ dateCreation: -1 });

        const { ServiceCalculsFinanciers } = await import('./calculsFinanciers');
        const serviceCalculs = new ServiceCalculsFinanciers();

        const objectifsAvecProgression = await Promise.all(
          objectifs.map(async (obj) => {
            const progression = await serviceCalculs.calculerProgressionObjectif(obj._id.toString());
            return {
              id: obj._id.toString(),
              nom: obj.nom,
              montantCible: obj.montantCible,
              montantActuel: obj.montantActuel,
              dateLimite: obj.dateLimite,
              type: obj.type,
              progression
            };
          })
        );

        return {
          type: 'objectifs_trouves',
          nombre: objectifsAvecProgression.length,
          objectifs: objectifsAvecProgression
        };
      }

      if (intention.type === 'modifier_transaction' || intention.type === 'supprimer_transaction') {
        // Rechercher d'abord la transaction
        const recherche = this.extraireInfosRecherche(intention.message);
        const transactions = await Transaction.find({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          ...(recherche.parametres.montant && { montant: recherche.parametres.montant }),
          ...(recherche.parametres.categorie && { categorie: recherche.parametres.categorie }),
          ...(recherche.parametres.type && { type: recherche.parametres.type })
        }).sort({ date: -1 }).limit(5);

        if (transactions.length > 0) {
          const transaction = transactions[0];
          if (intention.type === 'supprimer_transaction') {
            return await this.executerAction(utilisateurId, 'supprimer_transaction', {
              transactionId: transaction._id.toString()
            });
          } else {
            const messageLower = intention.message.toLowerCase();
            const montantMatch = messageLower.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)/);
            const nouveauMontant = montantMatch ? parseFloat(montantMatch[1].replace(/\s/g, '').replace(',', '.')) : undefined;
            
            return await this.executerAction(utilisateurId, 'modifier_transaction', {
              transactionId: transaction._id.toString(),
              ...(nouveauMontant && { montant: nouveauMontant })
            });
          }
        }
      }

      if (intention.type === 'analyser_habitudes') {
        const { ServiceCalculsFinanciers } = await import('./calculsFinanciers');
        const serviceCalculs = new ServiceCalculsFinanciers();
        const maintenant = new Date();
        const debutMois = startOfMonth(maintenant);
        const finMois = endOfMonth(maintenant);
        
        const repartition = await serviceCalculs.obtenirRepartitionDepenses(
          utilisateurId,
          debutMois,
          finMois
        );
        
        let repartitionFinale = repartition;
        let periode = 'mois';
        if (repartition.length === 0) {
          const debut3Mois = subMonths(maintenant, 3);
          repartitionFinale = await serviceCalculs.obtenirRepartitionDepenses(
            utilisateurId,
            debut3Mois,
            finMois
          );
          if (repartitionFinale.length > 0) {
            periode = '3_mois';
          }
        }
        
        return {
          type: 'habitudes_analysees',
          periode: periode,
          categories: repartitionFinale.slice(0, 10), 
          totalCategories: repartitionFinale.length
        };
      }

      if (intention.type === 'conseils') {
        return null; 
      }

      if (intention.type === 'creer_investissement' && intention.parametres) {
        return await this.executerAction(utilisateurId, 'creer_investissement', intention.parametres);
      }

      if (intention.type === 'creer_transaction_recurrente' && intention.parametres) {
        return await this.executerAction(utilisateurId, 'creer_transaction_recurrente', intention.parametres);
      }

    } catch (error: any) {
      console.error('Erreur lors de l\'exécution de l\'action détectée:', error);
      return null;
    }

    return null;
  }

//générer une réponse depuis une action exécutée
  private genererReponseDepuisAction(action: any, contexte: any): string {
    if (!action) return 'Action effectuée avec succès.';

    const devise = contexte.devise || 'MAD';
    const langue: 'fr' | 'en' | 'ar' = (contexte && (contexte as any).langue) || 'fr';

    const t = (fr: string, en: string, ar?: string) => {
      if (langue === 'en') return en;
      if (langue === 'ar' && ar) return ar;
      return fr;
    };

    switch (action.type) {
      case 'transaction_ajoutee': {
        const trans = action.details;
        return t(
          `✅ Transaction ajoutée avec succès : ${trans.description} - ${trans.montant} ${devise} (${trans.categorie})`,
          `✅ Transaction added successfully: ${trans.description} - ${trans.montant} ${devise} (${trans.categorie})`,
          `✅ تم إضافة العملية بنجاح: ${trans.description} - ${trans.montant} ${devise} (${trans.categorie})`
        );
      }

      case 'transaction_modifiee':
        return t(
          `✅ Transaction modifiée avec succès. ${action.message || ''}`,
          `✅ Transaction updated successfully. ${action.message || ''}`,
          `✅ تم تعديل العملية بنجاح. ${action.message || ''}`
        );

      case 'transaction_supprimee':
        return t(
          `✅ Transaction supprimée avec succès. ${action.message || ''}`,
          `✅ Transaction deleted successfully. ${action.message || ''}`,
          `✅ تم حذف العملية بنجاح. ${action.message || ''}`
        );

      case 'transactions_trouvees':
        if (action.nombre === 0) {
          return t(
            'Aucune transaction trouvée correspondant à vos critères.',
            'No transaction matched your criteria.',
            'لا توجد أي عملية مطابقة للمعايير.'
          );
        }
        const listeTrans = action.transactions
          .slice(0, 3)
          .map((tItem: any) => `${tItem.description}: ${tItem.montant} ${devise}`)
          .join(', ');
        return t(
          `J'ai trouvé ${action.nombre} transaction(s). ${listeTrans}`,
          `I found ${action.nombre} transaction(s). ${listeTrans}`,
          `لقد وجدت ${action.nombre} عملية(عمليات). ${listeTrans}`
        );

      case 'budget_cree': {
        const budget = action.details;
        return t(
          `✅ Budget créé avec succès : ${budget.nom} - ${budget.montant} ${devise}/${budget.periode}`,
          `✅ Budget created successfully: ${budget.nom} - ${budget.montant} ${devise}/${budget.periode}`,
          `✅ تم إنشاء الميزانية بنجاح: ${budget.nom} - ${budget.montant} ${devise}/${budget.periode}`
        );
      }

      case 'budgets_trouves':
        if (action.nombre === 0) {
          return t(
            'Vous n\'avez pas encore de budgets. Créez-en un pour commencer à suivre vos dépenses !',
            'You do not have any budgets yet. Create one to start tracking your spending!',
            'ليس لديك أي ميزانية بعد. أنشئ ميزانية لتبدأ في تتبع مصاريفك!'
          );
        }
        return t(
          `Vous avez ${action.nombre} budget(s) actif(s). ${action.budgets.slice(0, 3).map((b: any) => `${b.nom}: ${b.montant} ${devise}`).join(', ')}`,
          `You have ${action.nombre} active budget(s). ${action.budgets.slice(0, 3).map((b: any) => `${b.nom}: ${b.montant} ${devise}`).join(', ')}`,
          `لديك ${action.nombre} ميزانية نشِطة. ${action.budgets.slice(0, 3).map((b: any) => `${b.nom}: ${b.montant} ${devise}`).join(', ')}`
        );

      case 'objectif_cree': {
        const obj = action.details;
        const dateStr = new Date(obj.dateLimite).toLocaleDateString('fr-FR');
        return t(
          `✅ Objectif créé avec succès : ${obj.nom} - ${obj.montantCible} ${devise} d'ici ${dateStr}`,
          `✅ Goal created successfully: ${obj.nom} - ${obj.montantCible} ${devise} by ${dateStr}`,
          `✅ تم إنشاء الهدف بنجاح: ${obj.nom} - ${obj.montantCible} ${devise} قبل ${dateStr}`
        );
      }

      case 'investissement_cree': {
        const inv = action.details;
        return t(
          `✅ Investissement créé avec succès : ${inv.nom} - ${inv.montantInvesti} ${devise} (${inv.type})`,
          `✅ Investment created successfully: ${inv.nom} - ${inv.montantInvesti} ${devise} (${inv.type})`,
          `✅ تم إنشاء الاستثمار بنجاح: ${inv.nom} - ${inv.montantInvesti} ${devise} (${inv.type})`
        );
      }

      case 'transaction_recurrente_creee': {
        const tr = action.details;
        return t(
          `✅ Transaction récurrente créée avec succès : ${tr.description} - ${tr.montant} ${devise}/${tr.frequence}`,
          `✅ Recurring transaction created successfully: ${tr.description} - ${tr.montant} ${devise}/${tr.frequence}`,
          `✅ تم إنشاء عملية متكررة بنجاح: ${tr.description} - ${tr.montant} ${devise}/${tr.frequence}`
        );
      }

      case 'statistiques': {
        const stats = action.donnees;
        return t(
          `📊 Votre solde actuel est de ${stats.solde} ${devise}. Ce mois : ${stats.revenus} ${devise} de revenus, ${stats.depenses} ${devise} de dépenses. Taux d'épargne : ${stats.tauxEpargne.toFixed(1)}%`,
          `📊 Your current balance is ${stats.solde} ${devise}. This month: ${stats.revenus} ${devise} income, ${stats.depenses} ${devise} expenses. Savings rate: ${stats.tauxEpargne.toFixed(1)}%`,
          `📊 رصيدك الحالي هو ${stats.solde} ${devise}. هذا الشهر: ${stats.revenus} ${devise} دخل، ${stats.depenses} ${devise} مصاريف. نسبة الادخار: ${stats.tauxEpargne.toFixed(1)}%`
        );
      }

      case 'objectifs_trouves':
        if (action.nombre === 0) {
          return t(
            'Vous n\'avez pas encore d\'objectifs financiers. Créez-en un pour commencer à épargner !',
            'You do not have any financial goals yet. Create one to start saving!',
            'ليس لديك أي أهداف مالية بعد. أنشئ هدفاً لتبدأ في الادخار!'
          );
        }
        const objectifsDetails = action.objectifs.map((o: any) => {
          const montantRestant = o.montantCible - o.montantActuel;
          return {
            fr: `\n• ${o.nom}: ${o.montantActuel} ${devise} / ${o.montantCible} ${devise} (${o.progression.pourcentageComplete.toFixed(1)}%)\n  Reste: ${montantRestant} ${devise} | Mensuel requis: ${o.progression.montantMensuelRequis.toFixed(0)} ${devise}`,
            en: `\n• ${o.nom}: ${o.montantActuel} ${devise} / ${o.montantCible} ${devise} (${o.progression.pourcentageComplete.toFixed(1)}%)\n  Remaining: ${montantRestant} ${devise} | Required per month: ${o.progression.montantMensuelRequis.toFixed(0)} ${devise}`,
            ar: `\n• ${o.nom}: ${o.montantActuel} ${devise} / ${o.montantCible} ${devise} (${o.progression.pourcentageComplete.toFixed(1)}%)\n  المتبقي: ${montantRestant} ${devise} | المطلوب شهرياً: ${o.progression.montantMensuelRequis.toFixed(0)} ${devise}`
          };
        });
        const objectifsTexte = objectifsDetails
          .map((o: { en: any; ar: any; fr: any; }) => (langue === 'en' ? o.en : langue === 'ar' ? o.ar : o.fr))
          .join('');
        return t(
          `📊 Vous avez ${action.nombre} objectif(s) actif(s):${objectifsTexte}`,
          `📊 You have ${action.nombre} active goal(s):${objectifsTexte}`,
          `📊 لديك ${action.nombre} هدف(أهداف) نشِط(ة):${objectifsTexte}`
        );

      case 'habitudes_analysees':
        if (!action.categories || action.categories.length === 0) {
          return t(
            'Vous n\'avez pas encore de dépenses enregistrées pour analyser vos habitudes.',
            'You do not have enough expenses recorded yet to analyse your habits.',
            'لا توجد مصاريف كافية لتحليل عاداتك.'
          );
        }
        const periodeText = action.periode === '3_mois'
          ? t('les 3 derniers mois', 'the last 3 months', 'آخر 3 أشهر')
          : t('ce mois', 'this month', 'هذا الشهر');
        const categoriesList = action.categories
          .map((cat: any, index: number) =>
            `${index + 1}. ${cat.categorie}: ${cat.montant.toFixed(2)} ${devise} (${cat.pourcentage.toFixed(1)}%)`
          )
          .join('\n');
        return t(
          `📊 Voici où vous dépensez le plus ${periodeText}:\n\n${categoriesList}\n\nTotal: ${action.categories.length} catégorie(s) analysée(s)`,
          `📊 Here is where you spend the most over ${periodeText}:\n\n${categoriesList}\n\nTotal: ${action.categories.length} category(ies) analysed`,
          `📊 هذه هي الأماكن التي تصرف فيها أكثر خلال ${periodeText}:\n\n${categoriesList}\n\nالمجموع: ${action.categories.length} فئة تم تحليلها`
        );

      default:
        return t(
          'Action effectuée avec succès.',
          'Action completed successfully.',
          'تم تنفيذ العملية بنجاح.'
        );
    }
  }

  private async appelerNemotronViaOpenRouter(
    messagesHistorique: any[],
    messageUtilisateur: string,
    promptSystem: string
  ): Promise<string> {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY non configurée');
    }

    const messages = [
      { role: 'system', content: promptSystem },
      ...messagesHistorique.map(msg => ({
        role: msg.role === 'utilisateur' ? 'user' : 'assistant',
        content: msg.contenu
      })),
      { role: 'user', content: messageUtilisateur }
    ];

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'https://hssabaty.ma',
          'X-Title': 'Hssabaty Agent IA'
        },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-nano-30b-a3b',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data: any = await response.json();
      return data.choices?.[0]?.message?.content || 'Je comprends votre message. Comment puis-je vous aider avec vos finances ?';
    } catch (error: any) {
      console.error('[ServiceAgentIA] Erreur lors de l\'appel à Nemotron via OpenRouter:', error.message);
      throw error;
    }
  }
}
