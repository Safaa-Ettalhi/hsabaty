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

  async traiterMessage(
    utilisateurId: string,
    messageUtilisateur: string,
    conversationId?: string
  ): Promise<{ reponse: string; action?: any; conversationId?: string }> {
    const langue = this.detecterLangue(messageUtilisateur);
    const contexte = await this.obtenirContexteUtilisateur(utilisateurId);
    (contexte as any).langue = langue;
    // Désactivation de la détection directe pour prioriser l'intelligence du LLM
    // Cela permet une meilleure catégorisation et évite les faux positifs (ex: "pour" détecté comme objectif)
    /*
    const intentionInitiale = this.detecterIntention(messageUtilisateur);
    if (intentionInitiale) {
      let actionDirecte: any = null;
      try {
        if (intentionInitiale.type === 'creer_budget' && intentionInitiale.parametres) {
          actionDirecte = await this.executerAction(utilisateurId, 'creer_budget', intentionInitiale.parametres);
        } else if (intentionInitiale.type === 'creer_objectif' && intentionInitiale.parametres) {
          actionDirecte = await this.executerAction(utilisateurId, 'creer_objectif', intentionInitiale.parametres);
        } else if (intentionInitiale.type === 'creer_transaction_recurrente' && intentionInitiale.parametres) {
          actionDirecte = await this.executerAction(utilisateurId, 'creer_transaction_recurrente', intentionInitiale.parametres);
        } else if (intentionInitiale.type === 'ajouter_transaction' && intentionInitiale.parametres) {
          actionDirecte = await this.executerAction(utilisateurId, 'ajouter_transaction', intentionInitiale.parametres);
        }
      } catch (e) {
        console.error('[ServiceAgentIA] Erreur lors de l\'exécution directe de l\'intention:', e);
      }

      if (actionDirecte) {
        const reponseDirecte = this.genererReponseDepuisAction(actionDirecte, contexte);
        const newConvId = await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseDirecte, actionDirecte, conversationId);
        return { reponse: reponseDirecte, action: actionDirecte, conversationId: newConvId };
      }
    }
    */

    let conversation = null;
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findOne({ _id: conversationId, utilisateurId });
    }

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
          const actionParseeOpenAI = this.extraireActionDepuisReponse(reponseIA);
          if (actionParseeOpenAI) {
            const batchOpenAI = await this.executerActionsBatch(utilisateurId, actionParseeOpenAI, contexte);
            reponseIA = batchOpenAI.reponseIA;
            action = batchOpenAI.action;
          }
        }
        if (!action) {
          const intention = this.detecterIntention(messageUtilisateur);
          if (intention && (intention.type === 'gerer_objectif' || intention.type === 'gerer_budget' || intention.type === 'statistiques' || intention.type === 'comparaison_temporelle' || intention.type === 'analyser_habitudes')) {
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

        const actionParsee = this.extraireActionDepuisReponse(reponseIA);
        if (actionParsee) {
          const batchResult = await this.executerActionsBatch(utilisateurId, actionParsee, contexte);
          reponseIA = batchResult.reponseIA;
          action = batchResult.action;
        }
        if (!action) {
          const intention = this.detecterIntention(messageUtilisateur);
          if (intention) {
            action = await this.executerActionDetectee(utilisateurId, intention);
            if (action) {
              reponseIA = this.genererReponseDepuisAction(action, contexte);
            }
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

          const actionParsee = this.extraireActionDepuisReponse(reponseIA);
          if (actionParsee) {
            const batchResult = await this.executerActionsBatch(utilisateurId, actionParsee, contexte);
            reponseIA = batchResult.reponseIA;
            action = batchResult.action;
          }

          if (!action) {
            const intention = this.detecterIntention(messageUtilisateur);
            if (intention) {
              const actionDetectee = await this.executerActionDetectee(utilisateurId, intention);
              if (actionDetectee) {
                action = actionDetectee;
                reponseIA = this.genererReponseDepuisAction(action, contexte);
              }
            }
          }
          if (!reponseIA || reponseIA.trim().length === 0) {
            reponseIA = action
              ? this.genererReponseDepuisAction(action, contexte)
              : 'Comment puis-je vous aider avec vos finances ?';
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
              const actionParsee = this.extraireActionDepuisReponse(reponseIA);
              if (actionParsee) {
                const batchResult = await this.executerActionsBatch(utilisateurId, actionParsee, contexte);
                reponseIA = batchResult.reponseIA;
                action = batchResult.action;
              }
              if (!action) {
                const intention = this.detecterIntention(messageUtilisateur);
                if (intention) {
                  const actionDetectee = await this.executerActionDetectee(utilisateurId, intention);
                  if (actionDetectee) {
                    action = actionDetectee;
                    reponseIA = this.genererReponseDepuisAction(action, contexte);
                  }
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
                reponseIA = 'Comment puis-je vous aider avec vos finances ?';
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
              reponseIA = 'Comment puis-je vous aider avec vos finances ?';
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
          const newConvId = await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseBudget, actionBudget, conversationId);
          return { reponse: reponseBudget, action: actionBudget, conversationId: newConvId };
        }
      }

      if (!reponseIA || reponseIA.trim().length === 0) {
        reponseIA = action
          ? this.genererReponseDepuisAction(action, contexte)
          : 'Comment puis-je vous aider avec vos finances ?';
      }

      const newConvId = await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseIA, action, conversationId);

      return { reponse: reponseIA, action, conversationId: newConvId };
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
            let conversationFallback = null;
            if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
              conversationFallback = await Conversation.findOne({ _id: conversationId, utilisateurId });
            }
            
            const messagesHistorique = conversationFallback?.messages.slice(-10).map((msg: any) => ({
              role: msg.role,
              contenu: msg.contenu
            })) || [];
            
            let reponseIA = await this.appelerNemotronViaOpenRouter(messagesHistorique, messageUtilisateur, promptSystem);
            let action: any = null;
            
            const actionParsee = this.extraireActionDepuisReponse(reponseIA);
            if (actionParsee) {
              const batchResult = await this.executerActionsBatch(utilisateurId, actionParsee, contexte);
              reponseIA = batchResult.reponseIA;
              action = batchResult.action;
            }
            if (!action) {
              const intention = this.detecterIntention(messageUtilisateur);
              if (intention) {
                action = await this.executerActionDetectee(utilisateurId, intention);
                if (action) reponseIA = this.genererReponseDepuisAction(action, contexte);
              }
            }
            
            const newConvId = await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseIA, action, conversationId);
            return { reponse: reponseIA, action, conversationId: newConvId };
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
              : 'Comment puis-je vous aider avec vos finances ?';
          } else {
            reponseIA = 'Comment puis-je vous aider avec vos finances ?';
          }

          const newConvId = await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseIA, action, conversationId);
          return { reponse: reponseIA, action, conversationId: newConvId };
        } catch (fallbackError: any) {
          console.error('Erreur lors du fallback:', fallbackError);
          const reponseParDefaut = 'Je comprends votre message. Le service IA est temporairement indisponible, mais votre demande a été enregistrée.';
          const newConvId = await this.sauvegarderMessage(utilisateurId, messageUtilisateur, reponseParDefaut, undefined, conversationId);
          return { reponse: reponseParDefaut, conversationId: newConvId };
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
    const systemInstruction = "Tu es un expert financier. Tu DOIS ABSOLUMENT RÉPONDRE EN FRANÇAIS QUEL QUE SOIT LE CONTEXTE. Sois précis, structuré et professionnel. UTILISE TOUJOURS LE DIRHAM MAROCAIN (MAD ou DH) POUR LES MONTANTS, NE JAMAIS UTILISER L'EURO (€) OU LE DOLLAR ($).";
    try {
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
    } catch (e: any) {
      console.error("[ServiceAgentIA] Erreur genererConseils", e?.message || e);
      
      const msg = e?.message || '';
      const isQuotaError = e?.status === 429 || e?.status === 403 || e?.status === 401 ||
                           msg.includes('quota') || msg.includes('Quota') || msg.includes('billing') ||
                           msg.includes('credit');
      if (isQuotaError && this.provider === 'gemini' && process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_FALLBACK === 'true') {
         console.warn('[ServiceAgentIA] ⚠️ Crédit Gemini épuisé dans genererConseils, basculement automatique vers Nemotron via OpenRouter');
         try {
           const response = await this.appelerNemotronViaOpenRouter([], prompt, systemInstruction);
           return { reponse: response };
         } catch (nemotronError) {
           console.error("[ServiceAgentIA] Erreur Nemotron fallback dans genererConseils", nemotronError);
         }
      }

      return { reponse: "**1. Suivez vos dépenses**\nPrenez l'habitude de catégoriser toutes vos transactions pour une meilleure visibilité de votre budget hebdomadaire.\n\n**2. Épargnez régulièrement**\nMême des petits montants peuvent générer un excellent retour sur investissement à long terme.\n\n> Notre IA est actuellement en maintenance ou en surcharge réseau, ce conseil est basé sur des normes génériques." };
    }
  }

  private extraireActionDepuisReponse(reponseIA: string): { texte: string; action: any } | null {
    const actionBlocks = [...reponseIA.matchAll(/<<<ACTION>>>\s*([\s\S]*?)\s*<<<END_ACTION>>>/g)];
    if (actionBlocks.length === 0) return null;

    const texte = reponseIA
      .replace(/<<<ACTION>>>[\s\S]*?<<<END_ACTION>>>/g, '')
      .trim();

    const actions: any[] = [];
    for (const match of actionBlocks) {
      try {
        const actionJson = JSON.parse(match[1].trim());
        if (actionJson && actionJson.type) {
          actions.push(actionJson);
        }
      } catch (e) {
        console.error('[ServiceAgentIA] Erreur parsing action JSON depuis LLM:', e);
      }
    }

    if (actions.length === 0) return null;
    if (actions.length === 1) {
      return { texte, action: actions[0] };
    }
    return { texte, action: { type: 'batch', actions } };
  }

  private async executerActionsBatch(utilisateurId: string, actionParsee: { texte: string; action: any }, contexte: any): Promise<{ reponseIA: string; action: any }> {
    if (actionParsee.action.type === 'batch') {
      const resultats: any[] = [];
      const reponses: string[] = [];
      for (const act of actionParsee.action.actions) {
        try {
          const resultat = await this.executerAction(utilisateurId, act.type, act.parametres || {});
          if (resultat) {
            resultats.push(resultat);
            reponses.push(this.genererReponseDepuisAction(resultat, contexte));
          }
        } catch (e) {
          console.error('[ServiceAgentIA] Erreur exécution action batch:', e);
        }
      }
      if (resultats.length > 0) {
        return {
          reponseIA: reponses.join('\n'),
          action: { type: 'batch', resultats }
        };
      }
      return { reponseIA: actionParsee.texte, action: null };
    } else {
      try {
        const action = await this.executerAction(utilisateurId, actionParsee.action.type, actionParsee.action.parametres || {});
        if (action) {
          return {
            reponseIA: this.genererReponseDepuisAction(action, contexte),
            action
          };
        }
      } catch (e) {
        console.error('[ServiceAgentIA] Erreur exécution action:', e);
      }
      return { reponseIA: actionParsee.texte, action: null };
    }
  }

  private construirePromptSystem(contexte: any): string {
    const langue = (contexte && (contexte as any).langue) || 'fr';
    const descriptionLangue = langue === 'en'
      ? 'anglais'
      : langue === 'ar' || langue === 'darija'
        ? 'arabe (dialecte marocain / darija)'
        : 'français';

    return `
Tu es Hssabaty, assistant IA de gestion financière personnelle.

LANGUE: Réponds TOUJOURS dans la langue du dernier message de l'utilisateur.
Tu comprends TOUTES les langues: français, anglais, arabe classique, darija marocaine (en lettres arabes OU latines/franco-arabe), hindi, espagnol, etc.
Langue détectée: ${descriptionLangue}

CONTEXTE UTILISATEUR:
- Solde: ${contexte.solde || 0}
- Revenus ce mois: ${contexte.revenusMois || 0}
- Dépenses ce mois: ${contexte.depensesMois || 0}
- Budgets actifs: ${contexte.budgetsActifs || 0}
- Objectifs actifs: ${contexte.objectifsActifs || 0}

═══════════════════════════════════════════════════════════════
⚠️ RÈGLE CRITIQUE N°1 - COMPRENDRE TOUTE LANGUE / TODA LENGUA / हर भाषा
═══════════════════════════════════════════════════════════════

Tu es MULTILINGUE. Tu DOIS comprendre le SENS du message, PAS les mots exacts.
Exemples de messages qui signifient TOUS "j'ai dépensé 1000 MAD en shopping":
- FR: "j'ai dépensé 1000dh en shopping"
- EN: "I spent 1000 dirhams shopping"
- Darija latin: "khsart 1000dh f shoping", "khlest 1000 f lmrjane", "srift 1000dh"
- Darija arabe: "صرفت 1000 درهم فالشوبينغ"
- Hindi: "maine 1000 dirham shopping mein kharch kiye"
- Espagnol: "gasté 1000dh en compras"
- N'importe quel mélange: "lbr7 khsaaart 1000dh f shoping"

"lbr7" = "lbar7" = "lbareh" = hier/yesterday
"khsart"/"khsaaart"/"khsert"/"khlest"/"srift"/"dfe3t" = j'ai dépensé/payé
"f"/"fi"/"fel" = dans/en/at
"chrit" = j'ai acheté
"dkhel liya"/"jani"/"khlessouni" = j'ai reçu (revenu)

MAIS NE TE LIMITE PAS À CES EXEMPLES. Comprends le SENS quel que soit le dialecte ou la langue.

═══════════════════════════════════════════════════════════════
⚠️ RÈGLE CRITIQUE N°2 - TOUJOURS INCLURE UN BLOC ACTION JSON
═══════════════════════════════════════════════════════════════

Quand tu détectes une action financière dans le message (dépense, revenu, budget, objectif, etc.),
tu DOIS inclure un bloc JSON structuré dans ta réponse, encadré par les marqueurs <<<ACTION>>> et <<<END_ACTION>>>.

⚠️ ACTIONS MULTIPLES: Si l'utilisateur mentionne PLUSIEURS achats/dépenses/revenus dans UN SEUL message,
tu DOIS créer UN BLOC <<<ACTION>>>...<<<END_ACTION>>> SÉPARÉ pour CHAQUE item.
Exemple: "chrit zabda b 100dh o zit b 70dh" = 2 blocs ACTION (un pour zabda, un pour zit).

FORMAT OBLIGATOIRE (pour CHAQUE action):
<<<ACTION>>>
{
  "type": "nom_de_action",
  "parametres": { ... }
}
<<<END_ACTION>>>

TYPES D'ACTIONS DISPONIBLES:

1. "ajouter_transaction" - Quand l'utilisateur mentionne avoir dépensé ou reçu de l'argent
   parametres: { "montant": number, "type": "depense"|"revenu", "categorie": string, "description": string, "date": "ISO string" }

2. "creer_budget" - Quand l'utilisateur veut fixer une limite de dépenses
   parametres: { "nom": string, "montant": number, "categorie": string, "periode": "mensuel"|"trimestriel"|"annuel" }

3. "creer_objectif" - Quand l'utilisateur veut épargner pour un objectif
   parametres: { "nom": string, "montantCible": number, "dateLimite": "ISO string", "type": "epargne"|"remboursement"|"fonds_urgence"|"projet" }

4. "creer_investissement" - Uniquement quand l'utilisateur ENREGISTRE un placement avec un montant clair (compréhension du sens, toute langue). Jamais pour une simple question.
   parametres: { "nom": string, "type": "actions"|"obligations"|"fonds"|"crypto"|"immobilier"|"autre", "montantInvesti": number }

5. "creer_transaction_recurrente" - Paiement/revenu régulier
   parametres: { "nom": string, "montant": number, "type": "depense"|"revenu", "categorie": string, "frequence": "quotidien"|"hebdomadaire"|"mensuel"|"annuel", "description": string }

6. "rechercher_transactions" - Consulter l'historique
   parametres: { "description": string, "categorie": string, "type": "revenu"|"depense", "limite": number }

7. "supprimer_par_description" - Supprimer une transaction par sa description/montant (PAS besoin d'ID!)
   parametres: { "description": string, "montant": number (optionnel), "categorie": string (optionnel) }
   UTILISE CE TYPE quand l'utilisateur veut supprimer une transaction. Tu n'as PAS besoin de chercher d'abord.
   Exemples: "supprime la transaction du beurre", "msa7 transaction dyal zabda", "delete the butter purchase"

8. "modifier_par_description" - Modifier une transaction par sa description (PAS besoin d'ID!)
   parametres: { "description": string, "ancienMontant": number (optionnel), "nouveauMontant": number (optionnel), "nouvelleCategorie": string (optionnel), "nouvelleDescription": string (optionnel) }
   UTILISE CE TYPE quand l'utilisateur veut corriger une transaction.
   Exemples: "change le prix du beurre à 120dh", "bdel montant dyal zabda l 120"

9. "statistiques" - Demande de résumé/bilan financier
   parametres: {}

9b. "comparaison_temporelle" - Comparer ce mois au mois précédent ou à l'année dernière (revenus, dépenses, épargne)
   parametres: {}
   UTILISE quand l'utilisateur demande une comparaison temporelle, évolution, ou "par rapport au mois dernier / l'an dernier".

10. "analyser_habitudes" - Analyse des habitudes de dépenses
   parametres: {}

11. "conseils" - Demande de conseils financiers
   parametres: {}

12. "supprimer_budget_par_nom" - Supprimer un budget par son nom (PAS besoin d'ID!)
   parametres: { "nom": string, "categorie": string (optionnel) }
   UTILISE CE TYPE quand l'utilisateur veut supprimer un budget.
   Exemples: "supprime le budget alimentation", "msa7 budget dyal makla", "delete the food budget"

13. "modifier_budget_par_nom" - Modifier un budget par son nom (PAS besoin d'ID!)
   parametres: { "nom": string, "nouveauMontant": number (optionnel), "nouveauNom": string (optionnel), "nouvelleCategorie": string (optionnel), "nouvellePeriode": "mensuel"|"trimestriel"|"annuel" (optionnel) }
   UTILISE CE TYPE quand l'utilisateur veut modifier un budget existant.
   Exemples: "augmente le budget shopping à 3000dh", "bdel budget alimentation l 5000", "change food budget to 2000"

14. "supprimer_objectif_par_nom" - Supprimer un objectif par son nom (PAS besoin d'ID!)
   parametres: { "nom": string }
   UTILISE CE TYPE quand l'utilisateur veut supprimer un objectif.
   Exemples: "supprime l'objectif vacances", "msa7 objectif dyal dar", "delete the car goal"

15. "modifier_objectif_par_nom" - Modifier un objectif par son nom (PAS besoin d'ID!)
   parametres: { "nom": string, "nouveauMontantCible": number (optionnel), "nouveauMontantActuel": number (optionnel), "nouveauNom": string (optionnel), "nouvelleDateLimite": "ISO string" (optionnel), "nouveauType": "epargne"|"remboursement"|"fonds_urgence"|"projet" (optionnel) }
   UTILISE CE TYPE quand l'utilisateur veut modifier un objectif existant.
   Exemples: "change l'objectif voiture à 200000dh", "bdel objectif dar l 500000", "update car goal to 150000"

16. "supprimer_recurrente_par_nom" - Supprimer une transaction récurrente par son nom/description (PAS besoin d'ID!)
   parametres: { "nom": string, "categorie": string (optionnel) }
   UTILISE CE TYPE quand l'utilisateur veut supprimer une transaction récurrente/abonnement.
   Exemples: "supprime l'abonnement Netflix", "msa7 liya Netflix", "cancel the gym subscription"

17. "modifier_recurrente_par_nom" - Modifier une transaction récurrente par son nom/description (PAS besoin d'ID!)
   parametres: { "nom": string, "nouveauMontant": number (optionnel), "nouvelleDescription": string (optionnel), "nouvelleCategorie": string (optionnel), "nouvelleFrequence": "hebdomadaire"|"mensuel"|"trimestriel"|"annuel" (optionnel), "nouveauType": "depense"|"revenu" (optionnel) }
   UTILISE CE TYPE quand l'utilisateur veut modifier une transaction récurrente.
   Exemples: "change Netflix à 70dh", "bdel abonnement gym l 300", "update rent to 5000"

18. "consulter_objectifs" - Voir les objectifs financiers
   parametres: {}

19. "consulter_budgets" - Voir les budgets
   parametres: {}

20. "consulter_investissements" - Dès que le message concerne « ce que j'ai en portefeuille / placements / actifs » sans enregistrer quoi que ce soit. Comprends l'intention dans N'IMPORTE QUELLE langue ; n'utilise pas de liste de mots fixes.
   parametres: {}

21. "supprimer_tous_investissements_nom_exact" - PRIORITAIRE pour "msa7 ga3 ... smiyat investissement" / "smithom investissement" : un seul champ nomExact = "Investissement". Ne passe jamais smiyat/smithom/kamlin comme nom.
   parametres: { "nomExact": "Investissement" }

21b. "supprimer_investissement_par_nom" - Un seul actif par nom partiel, ou avec supprimerTous+nomExact pour tout supprimer au nom exact.

22. "modifier_investissement_par_nom" - Mettre à jour valeur actuelle, montant investi, etc. ; extrais "nom" et montants du contexte. Si indispensable manquant pour l'investissement seulement → pose UNE question courte.
   parametres: { "nom": string, "valeurActuelle": number (optionnel), "montantInvesti": number (optionnel), "nouveauNom": string (optionnel), ... }

═══════════════════════════════════════════════════════════════
INVESTISSEMENTS — COMPRÉHENSION INTELLIGENTE (PAS DE DÉTECTION MOTS)
═══════════════════════════════════════════════════════════════
- Pour tout ce qui touche au portefeuille / placements : tu DOIS appeler l'outil adapté OU inclure le bloc <<<ACTION>>> JSON. Le backend n'utilise plus de regex sur les messages pour les investissements.
- Comprends le SENS (question = consulter ; déclaration avec montant = créer ; suppression / mise à jour = types 21-22). Même en darija, arabe, anglais, etc.
- N'invente jamais un montant : sans montant explicite pour une création, appelle d'abord consulter_investissements ou demande une précision — uniquement si le doute porte sur l'investissement.

23. LOT / MULTIPLE investissements — quand l'utilisateur demande plusieurs opérations d'un coup :
   • Plusieurs AJOUTS → "creer_investissements_batch" avec parametres.items = [ { nom, montantInvesti, type? }, ... ]
   • Plusieurs SUPPRESSIONS → "supprimer_investissements_batch" avec parametres.noms = [ "bitcoin", "apple", ... ]
   • Plusieurs MODIFICATIONS → "modifier_investissements_batch" avec parametres.items = [ { nom, valeurActuelle? }, ... ]
   Alternative : plusieurs blocs <<<ACTION>>> séparés (un par investissement) — les deux sont exécutés.

EXEMPLES COMPLETS:

Message: "lbr7 khsaaart 1000dh f shoping"
Réponse: ✅ Dépense de 1000 MAD en Shopping enregistrée (hier) ! 🛍️
<<<ACTION>>>
{"type":"ajouter_transaction","parametres":{"montant":1000,"type":"depense","categorie":"Shopping","description":"Shopping","date":"${new Date(Date.now() - 86400000).toISOString()}"}}
<<<END_ACTION>>>

Message: "khsaaart 2000dh f restau"
Réponse: ✅ Dépense de 2000 MAD en Alimentation enregistrée ! 🍽️
<<<ACTION>>>
{"type":"ajouter_transaction","parametres":{"montant":2000,"type":"depense","categorie":"Alimentation","description":"Restaurant","date":"${new Date().toISOString()}"}}
<<<END_ACTION>>>

Message: "maine 500 rupees kharch kiye khane pe"
Réponse: ✅ 500 MAD ka kharcha Alimentation mein record ho gaya! 🍽️
<<<ACTION>>>
{"type":"ajouter_transaction","parametres":{"montant":500,"type":"depense","categorie":"Alimentation","description":"Khana","date":"${new Date().toISOString()}"}}
<<<END_ACTION>>>

Message: "chrit kilo zabda b 100dh o bido dzite b 70dh"
Réponse: ✅ 2 transactions enregistrées :
- Kilo zabda : 100 MAD (Alimentation) 🧈
- Bido dzite : 70 MAD (Alimentation) 🫒
<<<ACTION>>>
{"type":"ajouter_transaction","parametres":{"montant":100,"type":"depense","categorie":"Alimentation","description":"Kilo zabda (beurre)","date":"${new Date().toISOString()}"}}
<<<END_ACTION>>>
<<<ACTION>>>
{"type":"ajouter_transaction","parametres":{"montant":70,"type":"depense","categorie":"Alimentation","description":"Bido dzite (huile)","date":"${new Date().toISOString()}"}}
<<<END_ACTION>>>

Message: "j'ai acheté un kilo beurre à 111dh et 5L d'huile à 76dh"
Réponse: ✅ 2 transactions enregistrées :
- 1 kg beurre : 111 MAD (Alimentation) 🧈
- 5L huile : 76 MAD (Alimentation) 🫒
<<<ACTION>>>
{"type":"ajouter_transaction","parametres":{"montant":111,"type":"depense","categorie":"Alimentation","description":"1 kg beurre","date":"${new Date().toISOString()}"}}
<<<END_ACTION>>>
<<<ACTION>>>
{"type":"ajouter_transaction","parametres":{"montant":76,"type":"depense","categorie":"Alimentation","description":"5L huile","date":"${new Date().toISOString()}"}}
<<<END_ACTION>>>

Message: "msa7 liya transaction dyal Kilo Beurre de vache"
Réponse: ✅ Transaction "Kilo Beurre de vache" supprimée ! 🗑️
<<<ACTION>>>
{"type":"supprimer_par_description","parametres":{"description":"Kilo Beurre de vache"}}
<<<END_ACTION>>>

Message: "supprime la dépense du taxi"
Réponse: ✅ Transaction du taxi supprimée ! 🗑️
<<<ACTION>>>
{"type":"supprimer_par_description","parametres":{"description":"taxi"}}
<<<END_ACTION>>>

Message: "bdel montant dyal zabda l 120dh"
Réponse: ✅ Montant de la transaction "zabda" modifié à 120 MAD ! ✏️
<<<ACTION>>>
{"type":"modifier_par_description","parametres":{"description":"zabda","nouveauMontant":120}}
<<<END_ACTION>>>

Message: "bghit budget 3000dh f makla o budget 2000dh f transport"
Réponse: ✅ 2 budgets créés :
- Budget Alimentation : 3000 MAD/mensuel 🍽️
- Budget Transport : 2000 MAD/mensuel 🚗
<<<ACTION>>>
{"type":"creer_budget","parametres":{"nom":"Budget Alimentation","montant":3000,"categorie":"Alimentation","periode":"mensuel"}}
<<<END_ACTION>>>
<<<ACTION>>>
{"type":"creer_budget","parametres":{"nom":"Budget Transport","montant":2000,"categorie":"Transport","periode":"mensuel"}}
<<<END_ACTION>>>

Message: "supprime le budget alimentation"
Réponse: ✅ Budget "Alimentation" supprimé ! 🗑️
<<<ACTION>>>
{"type":"supprimer_budget_par_nom","parametres":{"nom":"alimentation"}}
<<<END_ACTION>>>

Message: "augmente le budget shopping à 5000dh"
Réponse: ✅ Budget "Shopping" modifié à 5000 MAD ! ✏️
<<<ACTION>>>
{"type":"modifier_budget_par_nom","parametres":{"nom":"shopping","nouveauMontant":5000}}
<<<END_ACTION>>>

Message: "supprime mon investissement bitcoin"
Réponse: ✅ Investissement "Bitcoin" supprimé du portefeuille ! 🗑️
<<<ACTION>>>
{"type":"supprimer_investissement_par_nom","parametres":{"nom":"bitcoin"}}
<<<END_ACTION>>>

Message: "mets la valeur actuelle de mes actions apple à 15000 mad"
Réponse: ✅ Valeur actuelle de "Apple" mise à jour : 15 000 MAD ! 📈
<<<ACTION>>>
{"type":"modifier_investissement_par_nom","parametres":{"nom":"apple","valeurActuelle":15000}}
<<<END_ACTION>>>

Message: (n'importe quelle langue) l'utilisateur demande ce qu'il a comme placements sans donner de montant d'achat
Réponse: (réponse naturelle) + bloc ACTION consulter_investissements
<<<ACTION>>>
{"type":"consulter_investissements","parametres":{}}
<<<END_ACTION>>>

Message: "zid liya bitcoin 5000 o apple 10000 f investissements"
Réponse: ✅ 2 investissements enregistrés
<<<ACTION>>>
{"type":"creer_investissements_batch","parametres":{"items":[{"nom":"Bitcoin","montantInvesti":5000,"type":"crypto"},{"nom":"Apple","montantInvesti":10000,"type":"actions"}]}}
<<<END_ACTION>>>

Message: "msa7 liya bitcoin o netflix mn investissements"
Réponse: ✅ Suppressions effectuées
<<<ACTION>>>
{"type":"supprimer_investissements_batch","parametres":{"noms":["bitcoin","netflix"]}}
<<<END_ACTION>>>

Message: "msa7 liya ga3 les investissement li 3ndhom smiyat investissement" / "le nom howa Investissement"
Réponse: ✅ Tous supprimés
<<<ACTION>>>
{"type":"supprimer_tous_investissements_nom_exact","parametres":{"nomExact":"Investissement"}}
<<<END_ACTION>>>

Message: "bghit nsejel objectif dyal tomobil 200000dh o objectif dyal dar 500000dh"
Réponse: ✅ 2 objectifs créés :
- Voiture : 200 000 MAD 🚗
- Maison : 500 000 MAD 🏠
<<<ACTION>>>
{"type":"creer_objectif","parametres":{"nom":"Voiture","montantCible":200000,"dateLimite":"${new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString()}","type":"epargne"}}
<<<END_ACTION>>>
<<<ACTION>>>
{"type":"creer_objectif","parametres":{"nom":"Maison","montantCible":500000,"dateLimite":"${new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString()}","type":"epargne"}}
<<<END_ACTION>>>

Message: "msa7 objectif dyal tomobil"
Réponse: ✅ Objectif "Voiture" supprimé ! 🗑️
<<<ACTION>>>
{"type":"supprimer_objectif_par_nom","parametres":{"nom":"voiture"}}
<<<END_ACTION>>>

Message: "bdel objectif dar l 600000dh"
Réponse: ✅ Objectif "Maison" modifié à 600 000 MAD ! ✏️
<<<ACTION>>>
{"type":"modifier_objectif_par_nom","parametres":{"nom":"dar","nouveauMontantCible":600000}}
<<<END_ACTION>>>

Message: "ajoute abonnement Netflix 70dh par mois o gym 300dh par mois"
Réponse: ✅ 2 transactions récurrentes créées :
- Netflix : 70 MAD/mensuel 📺
- Gym : 300 MAD/mensuel 💪
<<<ACTION>>>
{"type":"creer_transaction_recurrente","parametres":{"nom":"Netflix","montant":70,"type":"depense","categorie":"Divertissement","description":"Netflix","frequence":"mensuel"}}
<<<END_ACTION>>>
<<<ACTION>>>
{"type":"creer_transaction_recurrente","parametres":{"nom":"Gym","montant":300,"type":"depense","categorie":"Santé","description":"Abonnement Gym","frequence":"mensuel"}}
<<<END_ACTION>>>

Message: "supprime l'abonnement Netflix"
Réponse: ✅ Transaction récurrente "Netflix" supprimée ! 🗑️
<<<ACTION>>>
{"type":"supprimer_recurrente_par_nom","parametres":{"nom":"Netflix"}}
<<<END_ACTION>>>

Message: "change l'abonnement gym à 350dh"
Réponse: ✅ Abonnement Gym modifié à 350 MAD ! ✏️
<<<ACTION>>>
{"type":"modifier_recurrente_par_nom","parametres":{"nom":"gym","nouveauMontant":350}}
<<<END_ACTION>>>

═══════════════════════════════════════
CATÉGORISATION INTELLIGENTE
═══════════════════════════════════════
Déduis la catégorie par le CONTEXTE et le SENS, pas par des mots-clés exacts:
- 🍽️ Alimentation: tout ce qui se mange/boit (resto, café, courses, supermarché, makla, khobz, atay, qhwa)
- 🚗 Transport: tout déplacement (taxi, uber, bus, tram, essence, parking, tonobil, binsine)
- 🏠 Logement: habitation (loyer, factures, eau, électricité, internet, kra, lma, daw)
- 💊 Santé: soins (médecin, pharmacie, hôpital, tbib, farmacien)
- 📚 Éducation: apprentissage (école, cours, formations, livres, madrasa)
- 🎬 Divertissement: loisirs (cinéma, sport, gym, streaming, sorties, kharja)
- 🛍️ Shopping: achats (vêtements, électronique, cadeaux, marjane, zara, souk)
- 💰 Salaire | 📈 Investissement | 💵 Autres revenus | 📦 Autres

═══════════════════════════════════════
DATES & MONTANTS
═══════════════════════════════════════
- Si pas de date mentionnée → aujourd'hui
- "hier/yesterday/lbar7/lbr7/lbareh/ams/البارح" → hier
- "aujourd'hui/today/lyoum/lyom/اليوم" → aujourd'hui
- Montants: "150", "150dh", "150 MAD", "1.5k"→1500
- Devise par défaut: MAD

═══════════════════════════════════════
STYLE
═══════════════════════════════════════
- Amical, concis, avec emojis pertinents
- Après une action: confirme brièvement ce qui a été fait
- Adapte le ton à la langue de l'utilisateur (darija = décontracté, formel = formel)
- Félicite les bonnes habitudes, alerte subtilement sur les excès

⚠️ RAPPEL FINAL:
- INCLUS TOUJOURS le bloc <<<ACTION>>>...<<<END_ACTION>>> quand tu détectes une action financière. C'est OBLIGATOIRE. Sans ce bloc, l'action ne sera pas exécutée.
- Si PLUSIEURS achats/dépenses/revenus dans un même message → PLUSIEURS blocs ACTION séparés, un par item.
- Associe le BON montant au BON item. Ne mélange PAS les prix.
    `}

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
      
    };
  }

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
        name: 'consulter_investissements',
        description: 'Liste le portefeuille (investissements). À utiliser dès que l\'utilisateur veut VOIR / LISTER ses placements ou actifs, dans n\'importe quelle langue — compréhension sémantique uniquement, pas de mots-clés fixes. Aussi avant modifier/supprimer si besoin d\'identifier un actif.',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'supprimer_investissement_par_nom',
        description: 'Supprime un investissement par nom. Si plusieurs lignes ont le même nom générique (ex. "Investissement"), utiliser supprimerTous: true ou nomExact: "Investissement" pour tout supprimer d\'un coup.',
        parameters: {
          type: 'object',
          properties: {
            nom: { type: 'string', description: 'Nom ou partie du nom (recherche partielle si supprimerTous false)' },
            supprimerTous: { type: 'boolean', description: 'Si true : supprime TOUTES les lignes dont le nom est exactement égal à nomExact ou nom (ex. tous les "Investissement")' },
            nomExact: { type: 'string', description: 'Nom exact à cibler quand on veut tout supprimer (ex. Investissement)' },
            tous: { type: 'boolean', description: 'Alias de supprimerTous' }
          },
          required: ['nom']
        }
      },
      {
        name: 'supprimer_tous_investissements_nom_exact',
        description: 'Supprime TOUS les investissements dont le nom d\'affichage est exactement égal à nomExact (sans regex partielle). Utilise OBLIGATOIREMENT quand l\'utilisateur veut enlever toutes les lignes génériques "Investissement" (darija: smiyat investissement, ga3 li smithom investissement, etc.). Un seul paramètre = moins d\'erreur.',
        parameters: {
          type: 'object',
          properties: {
            nomExact: {
              type: 'string',
              description: 'Nom exact en base, ex. Investissement (avec majuscule ou non, match insensible à la casse)'
            }
          },
          required: ['nomExact']
        }
      },
      {
        name: 'modifier_investissement_par_nom',
        description: 'Met à jour un investissement par son nom : surtout valeur actuelle pour actualiser le rendement, ou montant investi, renommer, etc.',
        parameters: {
          type: 'object',
          properties: {
            nom: { type: 'string', description: 'Nom actuel de l\'investissement à retrouver' },
            valeurActuelle: { type: 'number', description: 'Nouvelle valeur actuelle de l\'actif (actualise dateValeur automatiquement)' },
            montantInvesti: { type: 'number', description: 'Corriger le montant initialement investi' },
            nouveauNom: { type: 'string', description: 'Renommer l\'investissement' },
            type: { type: 'string', enum: ['actions', 'obligations', 'fonds', 'crypto', 'immobilier', 'autre'] },
            description: { type: 'string', description: 'Description / note' }
          },
          required: ['nom']
        }
      },
      {
        name: 'creer_investissements_batch',
        description: 'Crée plusieurs investissements en une fois. Utilise quand l\'utilisateur enregistre plusieurs placements dans le même message (ex. bitcoin 5000 et apple 10000).',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Liste des investissements à créer',
              items: {
                type: 'object',
                properties: {
                  nom: { type: 'string' },
                  montantInvesti: { type: 'number' },
                  type: { type: 'string', enum: ['actions', 'obligations', 'fonds', 'crypto', 'immobilier', 'autre'] },
                  valeurActuelle: { type: 'number' },
                  description: { type: 'string' }
                },
                required: ['nom', 'montantInvesti']
              }
            }
          },
          required: ['items']
        }
      },
      {
        name: 'supprimer_investissements_batch',
        description: 'Supprime plusieurs investissements. Pour supprimer TOUTES les lignes avec le même nom exact (ex. ga3 li smiyat "Investissement"), passer nomExact: "Investissement" et supprimerTousCorrespondants: true (ou noms: ["Investissement"] + supprimerTousCorrespondants: true).',
        parameters: {
          type: 'object',
          properties: {
            noms: {
              type: 'array',
              items: { type: 'string' },
              description: 'Noms à supprimer (un par un par défaut). Avec supprimerTousCorrespondants, un seul nom exact supprime toutes les occurrences.'
            },
            supprimerTousCorrespondants: { type: 'boolean', description: 'Si true avec un nom : supprime toutes les lignes au nom exact, pas seulement la première' },
            nomExact: { type: 'string', description: 'Nom exact cible pour suppression totale (ex. Investissement)' },
            tous: { type: 'boolean', description: 'Alias supprimerTousCorrespondants' }
          },
          required: []
        }
      },
      {
        name: 'modifier_investissements_batch',
        description: 'Met à jour plusieurs investissements en une fois (valeur actuelle, montant, etc. par actif).',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nom: { type: 'string', description: 'Nom actuel à retrouver' },
                  valeurActuelle: { type: 'number' },
                  montantInvesti: { type: 'number' },
                  nouveauNom: { type: 'string' },
                  type: { type: 'string', enum: ['actions', 'obligations', 'fonds', 'crypto', 'immobilier', 'autre'] }
                },
                required: ['nom']
              }
            }
          },
          required: ['items']
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
        name: 'comparer_periodes',
        description: 'Compare les revenus, dépenses et épargne du mois en cours avec le mois précédent et le même mois l\'année dernière. À utiliser pour les questions de type "compare avec le mois dernier", "évolution par rapport à l\'an dernier", etc.',
        parameters: {
          type: 'object',
          properties: {},
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
      },
      {
        name: 'recherche_semantique',
        description: 'Recherche des transactions par sens sémantique (ex: "où sont mes cafés ?", "dépenses de plaisir"). À utiliser quand la recherche par description simple risque d\'échouer.',
        parameters: {
          type: 'object',
          properties: {
            requete: { type: 'string', description: 'Le sens de la recherche en langage naturel' },
            limite: { type: 'number', description: 'Nombre de résultats (défaut 5)' }
          },
          required: ['requete']
        }
      }
    ];
  }

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
        let transactionsTrouvees = await Transaction.find(filtreRecherche)
          .sort({ date: -1 })
          .limit(limite)
          .select('_id montant type categorie description date');

        // Fallback sémantique si aucun résultat direct n'est trouvé
        if (transactionsTrouvees.length === 0 && (parametres.description || parametres.categorie)) {
          console.log('[ServiceAgentIA] Aucun résultat direct, tentative de recherche sémantique...');
          const { VectorService } = await import('./vectorService');
          const query = parametres.description || parametres.categorie;
          const sim = await VectorService.rechercherSimilaires(utilisateurId, query, limite);
          if (sim && sim.length > 0) {
            return {
              type: 'transactions_trouvees',
              nombre: sim.length,
              transactions: sim.map((t: any) => ({
                id: (t.id || t._id || '').toString(),
                montant: t.montant,
                type: t.type,
                categorie: t.categorie,
                description: t.description,
                date: t.date
              }))
            };
          }
        }

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


        return {
          type: 'transaction_supprimee',
          details: detailsAvantSuppression,
          message: `Transaction supprimée avec succès: "${detailsAvantSuppression.description}" (${detailsAvantSuppression.montant})`
        };

      case 'supprimer_par_description': {
        const filtreSupp: any = { utilisateurId: new mongoose.Types.ObjectId(utilisateurId) };
        if (parametres.description) {
          filtreSupp.description = { $regex: parametres.description, $options: 'i' };
        }
        if (parametres.montant) {
          filtreSupp.montant = parametres.montant;
        }
        if (parametres.categorie) {
          filtreSupp.categorie = parametres.categorie;
        }
        const transASupprimer2 = await Transaction.findOne(filtreSupp).sort({ date: -1 });
        if (!transASupprimer2) {
          return {
            type: 'erreur',
            message: `Aucune transaction trouvée correspondant à "${parametres.description || 'votre recherche'}".`
          };
        }
        const detailsSuppression = {
          id: transASupprimer2._id.toString(),
          description: transASupprimer2.description,
          montant: transASupprimer2.montant,
          type: transASupprimer2.type,
          categorie: transASupprimer2.categorie,
          date: transASupprimer2.date
        };
        await Transaction.findByIdAndDelete(transASupprimer2._id);
        return {
          type: 'transaction_supprimee',
          details: detailsSuppression,
          message: `Transaction supprimée: "${detailsSuppression.description}" (${detailsSuppression.montant} MAD)`
        };
      }

      case 'modifier_par_description': {
        const filtreMod: any = { utilisateurId: new mongoose.Types.ObjectId(utilisateurId) };
        if (parametres.description) {
          filtreMod.description = { $regex: parametres.description, $options: 'i' };
        }
        if (parametres.ancienMontant) {
          filtreMod.montant = parametres.ancienMontant;
        }
        const transAModifier2 = await Transaction.findOne(filtreMod).sort({ date: -1 });
        if (!transAModifier2) {
          return {
            type: 'erreur',
            message: `Aucune transaction trouvée correspondant à "${parametres.description || 'votre recherche'}".`
          };
        }
        const modsEffectuees: string[] = [];
        if (parametres.nouveauMontant !== undefined) {
          transAModifier2.montant = parametres.nouveauMontant;
          modsEffectuees.push(`montant: ${parametres.nouveauMontant}`);
        }
        if (parametres.nouvelleCategorie) {
          transAModifier2.categorie = parametres.nouvelleCategorie;
          modsEffectuees.push(`catégorie: ${parametres.nouvelleCategorie}`);
        }
        if (parametres.nouvelleDescription) {
          transAModifier2.description = parametres.nouvelleDescription;
          modsEffectuees.push(`description: ${parametres.nouvelleDescription}`);
        }
        transAModifier2.dateModification = new Date();
        await transAModifier2.save();
        return {
          type: 'transaction_modifiee',
          details: transAModifier2,
          modifications: modsEffectuees,
          message: `Transaction modifiée: ${modsEffectuees.join(', ')}`
        };
      }

      case 'recherche_semantique': {
        const { VectorService } = await import('./vectorService');
        const searchResults = await VectorService.rechercherSimilaires(utilisateurId, parametres.requete, parametres.limite || 5);
        return {
          type: 'transactions_trouvees',
          nombre: searchResults.length,
          transactions: searchResults.map((t: any) => ({
            id: t.id,
            montant: t.montant,
            type: t.type,
            categorie: t.categorie,
            description: t.description,
            date: t.date
          }))
        };
      }

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

      case 'consulter_investissements': {
        const { Investissement: InvModel } = await import('../models/Investissement');
        const liste = await InvModel.find({
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          actif: true
        })
          .sort({ dateAchat: -1 })
          .limit(50)
          .lean();
        const totalInvesti = liste.reduce((s, i) => s + i.montantInvesti, 0);
        const totalValeur = liste.reduce((s, i) => s + (i.valeurActuelle ?? i.montantInvesti), 0);
        return {
          type: 'investissements_liste',
          nombre: liste.length,
          investissements: liste.map((i) => ({
            id: i._id.toString(),
            nom: i.nom,
            type: i.type,
            montantInvesti: i.montantInvesti,
            valeurActuelle: i.valeurActuelle ?? i.montantInvesti
          })),
          resume: { totalInvesti, totalValeur }
        };
      }

      case 'supprimer_tous_investissements_nom_exact': {
        const { Investissement: InvSuppExact } = await import('../models/Investissement');
        const uid = new mongoose.Types.ObjectId(utilisateurId);
        const nomExactOnly = String(parametres.nomExact ?? parametres.nom ?? '').trim();
        if (!nomExactOnly) {
          return {
            type: 'erreur',
            message: 'Indique le nom exact à supprimer (ex. nomExact: "Investissement").'
          };
        }
        const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const filtreExact: any = {
          utilisateurId: uid,
          actif: true,
          nom: new RegExp('^' + escape(nomExactOnly) + '$', 'i')
        };
        const docs = await InvSuppExact.find(filtreExact);
        if (docs.length === 0) {
          return {
            type: 'erreur',
            message: `Aucun investissement avec le nom exact "${nomExactOnly}".`
          };
        }
        for (const d of docs) {
          await InvSuppExact.findByIdAndDelete(d._id);
        }
        return {
          type: 'investissements_batch_supprimes',
          nombre: docs.length,
          details: docs.map((d) => ({ nom: d.nom, id: d._id.toString() })),
          message: `${docs.length} investissement(s) "${nomExactOnly}" supprimé(s).`
        };
      }

      case 'supprimer_investissement_par_nom': {
        const { Investissement: InvModelSupp } = await import('../models/Investissement');
        const uid = new mongoose.Types.ObjectId(utilisateurId);
        let nomRecherche = String(parametres.nom ?? parametres.nomExact ?? '').trim();
        const jetonsAmbigus = /^(smiyat|smiyhthom|smithom|kamlin|smiyto|smiythom|smiyathom)$/i;
        if (!nomRecherche || jetonsAmbigus.test(nomRecherche)) {
          if (parametres.nomExact && String(parametres.nomExact).trim()) {
            nomRecherche = String(parametres.nomExact).trim();
          } else {
            nomRecherche = 'Investissement';
          }
        }
        if (!nomRecherche) {
          return { type: 'erreur', message: 'Nom manquant pour la suppression.' };
        }
        const nomAmbigu = jetonsAmbigus.test(String(parametres.nom || ''));
        const supprimerTous =
          parametres.supprimerTous === true ||
          parametres.tous === true ||
          parametres.nomExact != null ||
          nomAmbigu;
        let nomExact =
          parametres.nomExact != null && String(parametres.nomExact).trim()
            ? String(parametres.nomExact).trim()
            : nomRecherche;
        if (nomAmbigu && (!parametres.nomExact || !String(parametres.nomExact).trim())) {
          nomExact = 'Investissement';
        }
        if (supprimerTous) {
          const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const filtreExact: any = {
            utilisateurId: uid,
            actif: true,
            nom: new RegExp('^' + escape(nomExact) + '$', 'i')
          };
          const docs = await InvModelSupp.find(filtreExact);
          if (docs.length === 0) {
            return {
              type: 'erreur',
              message: `Aucun investissement avec le nom exact "${nomExact}".`
            };
          }
          for (const d of docs) {
            await InvModelSupp.findByIdAndDelete(d._id);
          }
          return {
            type: 'investissements_batch_supprimes',
            nombre: docs.length,
            details: docs.map((d) => ({ nom: d.nom, id: d._id.toString() })),
            message: `${docs.length} investissement(s) nommé(s) "${nomExact}" supprimé(s).`
          };
        }
        const filtreInvSupp: any = {
          utilisateurId: uid,
          actif: true,
          nom: { $regex: nomRecherche, $options: 'i' }
        };
        const invASupprimer = await InvModelSupp.findOne(filtreInvSupp).sort({ dateCreation: -1 });
        if (!invASupprimer) {
          return {
            type: 'erreur',
            message: `Aucun investissement trouvé correspondant à "${nomRecherche}".`
          };
        }
        const detailsInvSupp = {
          id: invASupprimer._id.toString(),
          nom: invASupprimer.nom,
          montantInvesti: invASupprimer.montantInvesti
        };
        await InvModelSupp.findByIdAndDelete(invASupprimer._id);
        return {
          type: 'investissement_supprime',
          details: detailsInvSupp,
          message: `Investissement supprimé : "${detailsInvSupp.nom}"`
        };
      }

      case 'modifier_investissement_par_nom': {
        const { Investissement: InvModelMod } = await import('../models/Investissement');
        const filtreInvMod: any = {
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          actif: true,
          nom: { $regex: parametres.nom, $options: 'i' }
        };
        const invAModifier = await InvModelMod.findOne(filtreInvMod).sort({ dateCreation: -1 });
        if (!invAModifier) {
          return {
            type: 'erreur',
            message: `Aucun investissement trouvé correspondant à "${parametres.nom}".`
          };
        }
        const modsInv: string[] = [];
        if (parametres.valeurActuelle !== undefined) {
          invAModifier.valeurActuelle = parametres.valeurActuelle;
          invAModifier.dateValeur = new Date();
          modsInv.push(`valeur actuelle: ${parametres.valeurActuelle}`);
        }
        if (parametres.montantInvesti !== undefined) {
          invAModifier.montantInvesti = parametres.montantInvesti;
          modsInv.push(`montant investi: ${parametres.montantInvesti}`);
        }
        if (parametres.nouveauNom) {
          invAModifier.nom = parametres.nouveauNom;
          modsInv.push(`nom: ${parametres.nouveauNom}`);
        }
        if (parametres.type) {
          invAModifier.type = parametres.type;
          modsInv.push(`type: ${parametres.type}`);
        }
        if (parametres.description !== undefined) {
          invAModifier.description = parametres.description;
          modsInv.push('description mise à jour');
        }
        if (modsInv.length === 0) {
          return {
            type: 'erreur',
            message: 'Indiquez au moins une modification (ex. valeurActuelle, montantInvesti, nouveauNom).'
          };
        }
        invAModifier.dateModification = new Date();
        await invAModifier.save();
        return {
          type: 'investissement_modifie',
          details: invAModifier,
          modifications: modsInv,
          message: `Investissement "${invAModifier.nom}" modifié : ${modsInv.join(', ')}`
        };
      }

      case 'creer_investissements_batch': {
        const { Investissement: InvBatch } = await import('../models/Investissement');
        const items = Array.isArray(parametres.items) ? parametres.items : [];
        const crees: any[] = [];
        const erreurs: string[] = [];
        for (const it of items) {
          if (!it || !it.nom || it.montantInvesti == null) {
            erreurs.push(`Ignoré (nom ou montant manquant): ${JSON.stringify(it)}`);
            continue;
          }
          try {
            const inv = new InvBatch({
              utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
              nom: it.nom,
              type: it.type || 'autre',
              montantInvesti: it.montantInvesti,
              valeurActuelle: it.valeurActuelle ?? it.montantInvesti,
              rendementPourcentage: it.rendementPourcentage,
              dateAchat: it.dateAchat ? new Date(it.dateAchat) : new Date(),
              dateValeur: it.valeurActuelle != null ? new Date() : undefined,
              description: it.description
            });
            await inv.save();
            crees.push(inv);
          } catch (e: any) {
            erreurs.push(`${it.nom}: ${e?.message || 'erreur'}`);
          }
        }
        return {
          type: 'investissements_batch_crees',
          nombre: crees.length,
          details: crees,
          erreurs: erreurs.length ? erreurs : undefined
        };
      }

      case 'supprimer_investissements_batch': {
        const { Investissement: InvSuppBatch } = await import('../models/Investissement');
        const uid = new mongoose.Types.ObjectId(utilisateurId);
        const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const jetonsAmbigusBatch = /^(smiyat|smiyhthom|smithom|kamlin|smiyto|smiythom|smiyathom)$/i;
        let noms = Array.isArray(parametres.noms)
          ? parametres.noms
          : Array.isArray(parametres.items)
            ? parametres.items.map((x: any) => x?.nom).filter(Boolean)
            : [];
        if (noms.length === 0 && parametres.nomExact != null) {
          noms = [String(parametres.nomExact).trim()];
        }
        const nomsStr = noms.map((n: unknown) => String(n).trim()).filter(Boolean);
        const tousJetons =
          nomsStr.length > 0 && nomsStr.every((n: string) => jetonsAmbigusBatch.test(n));
        if (tousJetons) {
          noms = ['Investissement'];
          parametres.nomExact = 'Investissement';
        }
        let supprimerTousCorrespondants =
          parametres.supprimerTousCorrespondants === true || parametres.tous === true;
        if (parametres.nomExact === 'Investissement' || (noms.length === 1 && String(noms[0]).trim().toLowerCase() === 'investissement')) {
          supprimerTousCorrespondants = true;
        }
        const nomExactSeul =
          parametres.nomExact != null
            ? String(parametres.nomExact).trim()
            : noms.length === 1 && supprimerTousCorrespondants
              ? String(noms[0]).trim()
              : null;
        if (nomExactSeul && (supprimerTousCorrespondants || parametres.nomExact != null)) {
          const filtreExact: any = {
            utilisateurId: uid,
            actif: true,
            nom: new RegExp('^' + escape(nomExactSeul) + '$', 'i')
          };
          const docs = await InvSuppBatch.find(filtreExact);
          for (const d of docs) {
            await InvSuppBatch.findByIdAndDelete(d._id);
          }
          return {
            type: 'investissements_batch_supprimes',
            nombre: docs.length,
            details: docs.map((d) => ({ nom: d.nom, id: d._id.toString() })),
            erreurs:
              docs.length === 0
                ? [`Aucun investissement avec le nom exact "${nomExactSeul}".`]
                : undefined
          };
        }
        const supprimes: any[] = [];
        const erreurs: string[] = [];
        for (const nom of noms) {
          if (!nom || String(nom).trim().length < 1) continue;
          const nomStr = String(nom).trim();
          const tousPourCeNom =
            typeof nom === 'object' && nom !== null && (nom as any).supprimerTous === true;
          const nomPourFiltre = typeof nom === 'object' && nom !== null && (nom as any).nom != null
            ? String((nom as any).nom).trim()
            : nomStr;
          if (tousPourCeNom || supprimerTousCorrespondants) {
            const filtreExact: any = {
              utilisateurId: uid,
              actif: true,
              nom: new RegExp('^' + escape(nomPourFiltre) + '$', 'i')
            };
            const docs = await InvSuppBatch.find(filtreExact);
            for (const d of docs) {
              await InvSuppBatch.findByIdAndDelete(d._id);
              supprimes.push({ nom: d.nom, id: d._id.toString() });
            }
            if (docs.length === 0) erreurs.push(`Aucun exact: "${nomPourFiltre}"`);
            continue;
          }
          const filtre: any = {
            utilisateurId: uid,
            actif: true,
            nom: { $regex: nomStr, $options: 'i' }
          };
          const doc = await InvSuppBatch.findOne(filtre).sort({ dateCreation: -1 });
          if (!doc) {
            erreurs.push(`Non trouvé: "${nomStr}"`);
            continue;
          }
          await InvSuppBatch.findByIdAndDelete(doc._id);
          supprimes.push({ nom: doc.nom, id: doc._id.toString() });
        }
        return {
          type: 'investissements_batch_supprimes',
          nombre: supprimes.length,
          details: supprimes,
          erreurs: erreurs.length ? erreurs : undefined
        };
      }

      case 'modifier_investissements_batch': {
        const { Investissement: InvModBatch } = await import('../models/Investissement');
        const items = Array.isArray(parametres.items) ? parametres.items : [];
        const modifies: any[] = [];
        const erreurs: string[] = [];
        for (const it of items) {
          if (!it || !it.nom) {
            erreurs.push('Item sans nom ignoré');
            continue;
          }
          const filtre: any = {
            utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
            actif: true,
            nom: { $regex: String(it.nom).trim(), $options: 'i' }
          };
          const inv = await InvModBatch.findOne(filtre).sort({ dateCreation: -1 });
          if (!inv) {
            erreurs.push(`Non trouvé: "${it.nom}"`);
            continue;
          }
          const mods: string[] = [];
          if (it.valeurActuelle !== undefined) {
            inv.valeurActuelle = it.valeurActuelle;
            inv.dateValeur = new Date();
            mods.push(`valeur ${it.valeurActuelle}`);
          }
          if (it.montantInvesti !== undefined) {
            inv.montantInvesti = it.montantInvesti;
            mods.push(`montant ${it.montantInvesti}`);
          }
          if (it.nouveauNom) {
            inv.nom = it.nouveauNom;
            mods.push(`nom → ${it.nouveauNom}`);
          }
          if (it.type) {
            inv.type = it.type;
            mods.push(`type ${it.type}`);
          }
          if (it.description !== undefined) inv.description = it.description;
          if (mods.length === 0) {
            erreurs.push(`"${it.nom}": aucun champ à modifier`);
            continue;
          }
          inv.dateModification = new Date();
          await inv.save();
          modifies.push({ nom: inv.nom, modifications: mods });
        }
        return {
          type: 'investissements_batch_modifies',
          nombre: modifies.length,
          details: modifies,
          erreurs: erreurs.length ? erreurs : undefined
        };
      }

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

      case 'comparer_periodes':
      case 'comparaison_temporelle': {
        const { ServiceCalculsFinanciers } = await import('./calculsFinanciers');
        const serviceCalculs = new ServiceCalculsFinanciers();
        const comp = await serviceCalculs.comparerPeriodesFinancieres(utilisateurId);
        return { type: 'comparaison_temporelle', donnees: comp };
      }

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

      case 'supprimer_budget_par_nom': {
        const filtreBudgetSupp: any = {
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          actif: true
        };
        if (parametres.nom) {
          filtreBudgetSupp.nom = { $regex: parametres.nom, $options: 'i' };
        }
        if (parametres.categorie) {
          filtreBudgetSupp.categorie = { $regex: parametres.categorie, $options: 'i' };
        }
        const budgetASupprimer = await Budget.findOne(filtreBudgetSupp).sort({ dateCreation: -1 });
        if (!budgetASupprimer) {
          return {
            type: 'erreur',
            message: `Aucun budget trouvé correspondant à "${parametres.nom || parametres.categorie || 'votre recherche'}".`
          };
        }
        const detailsBudgetSupp = {
          id: budgetASupprimer._id.toString(),
          nom: budgetASupprimer.nom,
          montant: budgetASupprimer.montant,
          categorie: budgetASupprimer.categorie,
          periode: budgetASupprimer.periode
        };
        await Budget.findByIdAndDelete(budgetASupprimer._id);
        return {
          type: 'budget_supprime',
          details: detailsBudgetSupp,
          message: `Budget supprimé: "${detailsBudgetSupp.nom}" (${detailsBudgetSupp.montant} MAD/${detailsBudgetSupp.periode})`
        };
      }

      case 'modifier_budget_par_nom': {
        const filtreBudgetMod: any = {
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          actif: true
        };
        if (parametres.nom) {
          filtreBudgetMod.nom = { $regex: parametres.nom, $options: 'i' };
        }
        if (parametres.categorie) {
          filtreBudgetMod.categorie = { $regex: parametres.categorie, $options: 'i' };
        }
        const budgetAModifier = await Budget.findOne(filtreBudgetMod).sort({ dateCreation: -1 });
        if (!budgetAModifier) {
          return {
            type: 'erreur',
            message: `Aucun budget trouvé correspondant à "${parametres.nom || parametres.categorie || 'votre recherche'}".`
          };
        }
        const modsBudget: string[] = [];
        if (parametres.nouveauMontant !== undefined) {
          budgetAModifier.montant = parametres.nouveauMontant;
          modsBudget.push(`montant: ${parametres.nouveauMontant}`);
        }
        if (parametres.nouveauNom) {
          budgetAModifier.nom = parametres.nouveauNom;
          modsBudget.push(`nom: ${parametres.nouveauNom}`);
        }
        if (parametres.nouvelleCategorie) {
          budgetAModifier.categorie = parametres.nouvelleCategorie;
          modsBudget.push(`catégorie: ${parametres.nouvelleCategorie}`);
        }
        if (parametres.nouvellePeriode) {
          budgetAModifier.periode = parametres.nouvellePeriode;
          modsBudget.push(`période: ${parametres.nouvellePeriode}`);
        }
        budgetAModifier.dateModification = new Date();
        await budgetAModifier.save();
        return {
          type: 'budget_modifie',
          details: budgetAModifier,
          modifications: modsBudget,
          message: `Budget "${budgetAModifier.nom}" modifié: ${modsBudget.join(', ')}`
        };
      }
      case 'supprimer_objectif_par_nom': {
        const filtreObjSupp: any = {
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          actif: true
        };
        if (parametres.nom) {
          filtreObjSupp.nom = { $regex: parametres.nom, $options: 'i' };
        }
        const objectifASupprimer = await Objectif.findOne(filtreObjSupp).sort({ dateCreation: -1 });
        if (!objectifASupprimer) {
          return {
            type: 'erreur',
            message: `Aucun objectif trouvé correspondant à "${parametres.nom || 'votre recherche'}".`
          };
        }
        const detailsObjSupp = {
          id: objectifASupprimer._id.toString(),
          nom: objectifASupprimer.nom,
          montantCible: objectifASupprimer.montantCible,
          montantActuel: objectifASupprimer.montantActuel,
          type: objectifASupprimer.type
        };
        await Objectif.findByIdAndDelete(objectifASupprimer._id);
        return {
          type: 'objectif_supprime',
          details: detailsObjSupp,
          message: `Objectif supprimé: "${detailsObjSupp.nom}" (${detailsObjSupp.montantCible} MAD)`
        };
      }

      case 'modifier_objectif_par_nom': {
        const filtreObjMod: any = {
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          actif: true
        };
        if (parametres.nom) {
          filtreObjMod.nom = { $regex: parametres.nom, $options: 'i' };
        }
        const objectifAModifier = await Objectif.findOne(filtreObjMod).sort({ dateCreation: -1 });
        if (!objectifAModifier) {
          return {
            type: 'erreur',
            message: `Aucun objectif trouvé correspondant à "${parametres.nom || 'votre recherche'}".`
          };
        }
        const modsObjectif: string[] = [];
        if (parametres.nouveauMontantCible !== undefined) {
          objectifAModifier.montantCible = parametres.nouveauMontantCible;
          modsObjectif.push(`montant cible: ${parametres.nouveauMontantCible}`);
        }
        if (parametres.nouveauMontantActuel !== undefined) {
          objectifAModifier.montantActuel = parametres.nouveauMontantActuel;
          modsObjectif.push(`montant actuel: ${parametres.nouveauMontantActuel}`);
        }
        if (parametres.nouveauNom) {
          objectifAModifier.nom = parametres.nouveauNom;
          modsObjectif.push(`nom: ${parametres.nouveauNom}`);
        }
        if (parametres.nouvelleDateLimite) {
          objectifAModifier.dateLimite = new Date(parametres.nouvelleDateLimite);
          modsObjectif.push(`date limite: ${parametres.nouvelleDateLimite}`);
        }
        if (parametres.nouveauType) {
          objectifAModifier.type = parametres.nouveauType;
          modsObjectif.push(`type: ${parametres.nouveauType}`);
        }
        objectifAModifier.dateModification = new Date();
        await objectifAModifier.save();
        return {
          type: 'objectif_modifie',
          details: objectifAModifier,
          modifications: modsObjectif,
          message: `Objectif "${objectifAModifier.nom}" modifié: ${modsObjectif.join(', ')}`
        };
      }
      case 'supprimer_recurrente_par_nom': {
        const { TransactionRecurrente: TRSupp } = await import('../models/TransactionRecurrente');
        const filtreRecSupp: any = {
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          actif: true
        };
        if (parametres.nom || parametres.description) {
          filtreRecSupp.description = { $regex: parametres.nom || parametres.description, $options: 'i' };
        }
        if (parametres.categorie) {
          filtreRecSupp.categorie = { $regex: parametres.categorie, $options: 'i' };
        }
        const recurrenteASupprimer = await TRSupp.findOne(filtreRecSupp).sort({ dateCreation: -1 });
        if (!recurrenteASupprimer) {
          return {
            type: 'erreur',
            message: `Aucune transaction récurrente trouvée correspondant à "${parametres.nom || parametres.description || 'votre recherche'}".`
          };
        }
        const detailsRecSupp = {
          id: recurrenteASupprimer._id.toString(),
          description: recurrenteASupprimer.description,
          montant: recurrenteASupprimer.montant,
          type: recurrenteASupprimer.type,
          categorie: recurrenteASupprimer.categorie,
          frequence: recurrenteASupprimer.frequence
        };
        await TRSupp.findByIdAndDelete(recurrenteASupprimer._id);
        return {
          type: 'recurrente_supprimee',
          details: detailsRecSupp,
          message: `Transaction récurrente supprimée: "${detailsRecSupp.description}" (${detailsRecSupp.montant} MAD/${detailsRecSupp.frequence})`
        };
      }

      case 'modifier_recurrente_par_nom': {
        const { TransactionRecurrente: TRMod } = await import('../models/TransactionRecurrente');
        const filtreRecMod: any = {
          utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
          actif: true
        };
        if (parametres.nom || parametres.description) {
          filtreRecMod.description = { $regex: parametres.nom || parametres.description, $options: 'i' };
        }
        if (parametres.categorie) {
          filtreRecMod.categorie = { $regex: parametres.categorie, $options: 'i' };
        }
        const recurrenteAModifier = await TRMod.findOne(filtreRecMod).sort({ dateCreation: -1 });
        if (!recurrenteAModifier) {
          return {
            type: 'erreur',
            message: `Aucune transaction récurrente trouvée correspondant à "${parametres.nom || parametres.description || 'votre recherche'}".`
          };
        }
        const modsRecurrente: string[] = [];
        if (parametres.nouveauMontant !== undefined) {
          recurrenteAModifier.montant = parametres.nouveauMontant;
          modsRecurrente.push(`montant: ${parametres.nouveauMontant}`);
        }
        if (parametres.nouvelleDescription) {
          recurrenteAModifier.description = parametres.nouvelleDescription;
          modsRecurrente.push(`description: ${parametres.nouvelleDescription}`);
        }
        if (parametres.nouvelleCategorie) {
          recurrenteAModifier.categorie = parametres.nouvelleCategorie;
          modsRecurrente.push(`catégorie: ${parametres.nouvelleCategorie}`);
        }
        if (parametres.nouvelleFrequence) {
          recurrenteAModifier.frequence = parametres.nouvelleFrequence;
          modsRecurrente.push(`fréquence: ${parametres.nouvelleFrequence}`);
        }
        if (parametres.nouveauType) {
          recurrenteAModifier.type = parametres.nouveauType;
          modsRecurrente.push(`type: ${parametres.nouveauType}`);
        }
        recurrenteAModifier.dateModification = new Date();
        await recurrenteAModifier.save();
        return {
          type: 'recurrente_modifiee',
          details: recurrenteAModifier,
          modifications: modsRecurrente,
          message: `Transaction récurrente "${recurrenteAModifier.description}" modifiée: ${modsRecurrente.join(', ')}`
        };
      }

      default:
        return null;
    }
  }

  private async sauvegarderMessage(
    utilisateurId: string,
    messageUtilisateur: string,
    reponseIA: string,
    action?: any,
    conversationId?: string
  ): Promise<string> {
    let conversation = null;

    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findOne({ _id: conversationId, utilisateurId });
    }

    if (!conversation) {
      const charLimit = 40;
      conversation = new Conversation({
        utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
        titre: messageUtilisateur.substring(0, charLimit) + (messageUtilisateur.length > charLimit ? '...' : ''),
        messages: []
      });
    }

    if (!messageUtilisateur || messageUtilisateur.trim().length === 0) {
      throw new Error('Le message utilisateur ne peut pas être vide');
    }

    if (!reponseIA || reponseIA.trim().length === 0) {
      reponseIA = 'Comment puis-je vous aider avec vos finances ?';
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
    return conversation._id.toString();
  }

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

    if (
      messageLower.match(
        /(compare|comparaison|par rapport|vs\.? | versus |mois dernier|mois précédent|mois d'avant|mois passé|l'an dernier|année dernière|même mois.*an dernier|last month|last year|year over year|yoy|évolution.*mois|différence.*mois)/i
      )
    ) {
      return { type: 'comparaison_temporelle', message: messageUtilisateur };
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

    // Investissements : pas de détection par mots-clés — uniquement JSON / outils LLM (voir prompt INVESTISSEMENTS)

    if (messageLower.match(/(abonnement|mensuel|récurrent|رَسوم|كل شهر|كل أسبوع|chaque mois|chaque semaine|tous les mois|tous les ans|netflix|spotify|loyer|salaire mensuel|subscription|every month|each month|every week)/i)) {
      return this.extraireInfosTransactionRecurrente(messageUtilisateur);
    }

    return null;
  }

  private extraireInfosTransaction(message: string): any {
    const messageLower = message.toLowerCase();
    
    const montantMatch = message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)\s*(?:MAD|mad|dh|dirham)/i) || 
                         message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)/);
    const montant = montantMatch ? parseFloat(montantMatch[1].replace(/\s/g, '').replace(',', '.')) : null;

    const type = messageLower.match(/(salaire|revenu|reçu|gagné|salary|income|paycheck|i\s+received)/i)
      ? 'revenu'
      : 'depense';

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

  private extraireInfosBudget(message: string): any {
    const messageLower = message.toLowerCase();
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

  private extraireInfosObjectif(message: string): any {
    const messageLower = message.toLowerCase();
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

  private extraireInfosRecherche(message: string): any {
    const messageLower = message.toLowerCase();
    const parametres: any = {};

    const montantMatch = message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)\s*(?:MAD|mad|dh|dirham)/i) || 
                         message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)/);
    if (montantMatch) {
      parametres.montant = parseFloat(montantMatch[1].replace(/\s/g, '').replace(',', '.'));
    }

    if (messageLower.match(/(alimentation|restaurant|manger|food)/i)) parametres.categorie = 'Alimentation';
    else if (messageLower.match(/(transport|carburant|taxi)/i)) parametres.categorie = 'Transport';
    else if (messageLower.match(/(logement|loyer|électricité)/i)) parametres.categorie = 'Logement';
    else if (messageLower.match(/(santé|médecin|pharmacie)/i)) parametres.categorie = 'Santé';

    if (messageLower.match(/(revenus|revenu|salaire)/i)) parametres.type = 'revenu';
    else if (messageLower.match(/(dépenses|dépense)/i)) parametres.type = 'depense';

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

  private extraireInfosTransactionRecurrente(message: string): any {
    const messageLower = message.toLowerCase();
    
    const montantMatch = message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)\s*(?:MAD|mad|dh|dirham)/i) || 
                         message.match(/(\d+(?:\s*\d+)*(?:[.,]\d+)?)/);
    const montant = montantMatch ? parseFloat(montantMatch[1].replace(/\s/g, '').replace(',', '.')) : null;

    const type = messageLower.match(/(salaire|revenu|reçu|gagné)/i) ? 'revenu' : 'depense';

    let frequence = 'mensuel';
    if (messageLower.match(/(hebdomadaire|chaque semaine|toutes les semaines|semaine)/i)) frequence = 'hebdomadaire';
    else if (messageLower.match(/(trimestriel|trimestre|tous les 3 mois)/i)) frequence = 'trimestriel';
    else if (messageLower.match(/(annuel|année|chaque année|tous les ans)/i)) frequence = 'annuel';

    let categorie = 'Autres';
    if (messageLower.match(/(netflix|spotify|disney|abonnement|streaming)/i)) categorie = 'Divertissement';
    else if (messageLower.match(/(loyer|logement|rent)/i)) categorie = 'Logement';
    else if (messageLower.match(/(salaire|revenu|paie|salary|income)/i)) categorie = 'Salaire';
    else if (messageLower.match(/(électricité|eau|gaz|internet|téléphone)/i)) categorie = 'Logement';
    else if (messageLower.match(/(gym|salle de sport|fitness)/i)) categorie = 'Santé';
    if (/(الكراء|لكراء|الايجار|ايجار|الاجار|الاجر|كراء|إيجار)/i.test(message)) {
      categorie = 'Logement';
    }

    const descMatch =
      message.match(/(netflix|spotify|disney|loyer|salaire|électricité|eau|gaz|internet|téléphone|gym|salle de sport|rent|الكراء|كراء|إيجار)/i) ||
      message.match(/(?:abonnement|paiement)\s+([^0-9]+?)(?:\s+de|\s+pour)/i);
    const description = descMatch ? descMatch[1] || descMatch[0] : 'Transaction récurrente';

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

  private async executerActionDetectee(utilisateurId: string, intention: any): Promise<any> {
    if (!intention || !intention.type) return null;

    try {
      if (intention.type === 'ajouter_transaction' && intention.parametres) {
        return await this.executerAction(utilisateurId, 'ajouter_transaction', intention.parametres);
      }

      if (intention.type === 'rechercher_transactions' && intention.parametres) {
        return await this.executerAction(utilisateurId, 'rechercher_transactions', intention.parametres);
      }

      if (intention.type === 'comparaison_temporelle') {
        const { ServiceCalculsFinanciers } = await import('./calculsFinanciers');
        const serviceCalculs = new ServiceCalculsFinanciers();
        const comp = await serviceCalculs.comparerPeriodesFinancieres(utilisateurId);
        return { type: 'comparaison_temporelle', donnees: comp };
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

      if (intention.type === 'creer_transaction_recurrente' && intention.parametres) {
        return await this.executerAction(utilisateurId, 'creer_transaction_recurrente', intention.parametres);
      }

    } catch (error: any) {
      console.error('Erreur lors de l\'exécution de l\'action détectée:', error);
      return null;
    }

    return null;
  }

  private genererReponseDepuisAction(action: any, contexte: any): string {
    if (!action) return 'Action effectuée avec succès.';

    
    const langue: 'fr' | 'en' | 'ar' = (contexte && (contexte as any).langue) || 'fr';

    const t = (fr: string, en: string, ar?: string) => {
      if (langue === 'en') return en;
      if (langue === 'ar' && ar) return ar;
      return fr;
    };

    const ok = (titre: string, lignes: string[]) =>
      `## ${titre}\n\n` + lignes.map((l) => `- ${l}`).join('\n');

    switch (action.type) {
      case 'transaction_ajoutee': {
        const trans = action.details;
        return t(
          ok('Transaction enregistrée', [
            `**Description** : ${trans.description}`,
            `**Montant** : ${trans.montant} MAD`,
            `**Catégorie** : ${trans.categorie}`,
          ]),
          ok('Transaction recorded', [
            `**Description** : ${trans.description}`,
            `**Amount** : ${trans.montant}`,
            `**Category** : ${trans.categorie}`,
          ]),
          `## تم التسجيل\n\n- ${trans.description} — ${trans.montant} (${trans.categorie})`
        );
      }

      case 'transaction_modifiee':
        return t(
          ok('Transaction modifiée', [action.message || 'Mise à jour effectuée.']),
          ok('Transaction updated', [action.message || 'Update completed.']),
          `## تم التعديل\n\n${action.message || ''}`
        );

      case 'transaction_supprimee':
        return t(
          ok('Transaction supprimée', [action.message || 'Suppression effectuée.']),
          ok('Transaction deleted', [action.message || 'Deletion completed.']),
          `## تم الحذف\n\n${action.message || ''}`
        );

      case 'transactions_trouvees':
        if (action.nombre === 0) {
          return t(
            '> Aucune transaction ne correspond à vos critères.\n\nEssayez d’élargir la recherche (dates, catégorie).',
            '> No transaction matched your criteria.',
            '> لا توجد نتائج.'
          );
        }
        const rows = action.transactions
          .slice(0, 10)
          .map((tItem: any) => {
            const d = tItem.date ? new Date(tItem.date).toLocaleDateString('fr-FR') : '—';
            return `| ${(tItem.description || '—').replace(/\|/g, ' ')} | ${tItem.montant} | ${tItem.type || '—'} | ${tItem.categorie || '—'} | ${d} |`;
          })
          .join('\n');
        return t(
          `## Résultats de recherche\n\n**${action.nombre}** transaction(s) trouvée(s).\n\n| Description | Montant | Type | Catégorie | Date |\n|-------------|--------:|:-----|:----------|:-----|\n${rows}`,
          `## Search results\n\n**${action.nombre}** transaction(s) found.\n\n| Description | Amount | Type | Category | Date |\n|-------------|--------:|:-----|:---------|------|\n${rows}`,
          `## نتائج البحث\n\n**${action.nombre}** عملية.\n\n${rows}`
        );

      case 'budget_cree': {
        const budget = action.details;
        return t(
          ok('Budget créé', [
            `**Nom** : ${budget.nom}`,
            `**Montant** : ${budget.montant} MAD`,
            `**Période** : ${budget.periode}`,
          ]),
          ok('Budget created', [`**Name** : ${budget.nom}`, `**Amount** : ${budget.montant}`, `**Period** : ${budget.periode}`]),
          `## ميزانية جديدة\n\n- ${budget.nom} — ${budget.montant} / ${budget.periode}`
        );
      }

      case 'budgets_trouves':
        if (action.nombre === 0) {
          return t(
            '> Vous n’avez pas encore de budget.\n\nCréez-en un pour suivre vos dépenses par catégorie.',
            '> You have no budgets yet.',
            '> لا توجد ميزانيات.'
          );
        }
        const budgetRows = action.budgets
          .slice(0, 15)
          .map((b: any) => `| ${b.nom} | ${b.montant} | ${b.categorie || '—'} | ${b.periode || '—'} | ${b.actif ? 'Oui' : 'Non'} |`)
          .join('\n');
        return t(
          `## Vos budgets (${action.nombre})\n\n| Nom | Montant | Catégorie | Période | Actif |\n|-----|--------:|:----------|:--------|:-----:|\n${budgetRows}`,
          `## Your budgets (${action.nombre})\n\n| Name | Amount | Category | Period | Active |\n|------|--------:|:---------|:-------|:------:|\n${budgetRows}`,
          `## الميزانيات (${action.nombre})\n\n${budgetRows}`
        );

      case 'objectif_cree': {
        const obj = action.details;
        const dateStr = new Date(obj.dateLimite).toLocaleDateString('fr-FR');
        return t(
          ok('Objectif créé', [
            `**Nom** : ${obj.nom}`,
            `**Cible** : ${obj.montantCible} MAD`,
            `**Échéance** : ${dateStr}`,
          ]),
          ok('Goal created', [`**Name** : ${obj.nom}`, `**Target** : ${obj.montantCible}`, `**Deadline** : ${dateStr}`]),
          `## هدف جديد\n\n- ${obj.nom} — ${obj.montantCible} — ${dateStr}`
        );
      }

      case 'investissement_cree': {
        const inv = action.details;
        return t(
          ok('Investissement enregistré', [`**${inv.nom}**`, `**Montant** : ${inv.montantInvesti} MAD`, `**Type** : ${inv.type}`]),
          ok('Investment recorded', [`**${inv.nom}**`, `**Amount** : ${inv.montantInvesti}`, `**Type** : ${inv.type}`]),
          `## استثمار\n\n- ${inv.nom} — ${inv.montantInvesti}`
        );
      }

      case 'investissements_liste': {
        const invs = action.investissements || [];
        const resume = action.resume;
        if (invs.length === 0) {
          return t(
            'Aucun investissement enregistré pour le moment.',
            'No investments recorded yet.',
            'لا توجد استثمارات مسجلة.'
          );
        }
        const lignes = invs.slice(0, 15).map((i: any) => {
          // Plusieurs entrées avec le même nom générique : distinguer par suffixe id
          const nomAffiche =
            /^investissement$/i.test(String(i.nom || '').trim()) && i.id
              ? `Investissement (${String(i.id).slice(-6)})`
              : i.nom;
          return `**${nomAffiche}** — investi ${i.montantInvesti} MAD — valeur ${i.valeurActuelle} MAD (${i.type})`;
        });
        const resumeStr = resume
          ? `\n\n_Total investi : ${resume.totalInvesti} MAD — Valeur totale : ${resume.totalValeur} MAD_`
          : '';
        return t(
          ok('Vos investissements', lignes) + resumeStr,
          ok('Your investments', lignes) + resumeStr,
          `## محفظتك\n\n` + invs.slice(0, 10).map((i: any) => `- ${i.nom}: ${i.valeurActuelle}`).join('\n')
        );
      }

      case 'investissement_supprime':
        return t(
          ok('Investissement supprimé', [action.message || action.details?.nom || 'Suppression confirmée.']),
          ok('Investment deleted', [action.message || action.details?.nom || 'Confirmed.']),
          `## تم الحذف\n\n${action.message || ''}`
        );

      case 'investissement_modifie': {
        const inv = action.details;
        const va = inv?.valeurActuelle != null ? `**Valeur actuelle** : ${inv.valeurActuelle} MAD` : null;
        const lignes = [action.message || 'Mise à jour confirmée.', va].filter(Boolean);
        return t(
          ok('Investissement modifié', lignes as string[]),
          ok('Investment updated', lignes as string[]),
          `## تم التعديل\n\n${action.message || ''}`
        );
      }

      case 'investissements_batch_crees': {
        const n = action.nombre || 0;
        const details = action.details || [];
        const lignes = details.slice(0, 20).map((inv: any) => `**${inv.nom}** — ${inv.montantInvesti} MAD (${inv.type})`);
        const err = action.erreurs?.length ? `\n\n⚠ ${action.erreurs.join('; ')}` : '';
        return t(
          ok(`${n} investissement(s) enregistré(s)`, lignes) + err,
          ok(`${n} investment(s) recorded`, lignes) + err,
          `## تم التسجيل — ${n}\n\n` + lignes.join('\n') + err
        );
      }

      case 'investissements_batch_supprimes': {
        const n = action.nombre || 0;
        const details = action.details || [];
        const lignes = details.map((d: any) => `**${d.nom}** supprimé`);
        const err = action.erreurs?.length ? `\n\n⚠ ${action.erreurs.join('; ')}` : '';
        return t(
          ok(`${n} investissement(s) supprimé(s)`, lignes) + err,
          ok(`${n} investment(s) deleted`, lignes) + err,
          `## تم الحذف — ${n}\n\n` + lignes.join('\n') + err
        );
      }

      case 'investissements_batch_modifies': {
        const n = action.nombre || 0;
        const details = action.details || [];
        const lignes = details.map((d: any) => `**${d.nom}** : ${(d.modifications || []).join(', ')}`);
        const err = action.erreurs?.length ? `\n\n⚠ ${action.erreurs.join('; ')}` : '';
        return t(
          ok(`${n} investissement(s) modifié(s)`, lignes) + err,
          ok(`${n} investment(s) updated`, lignes) + err,
          `## تم التعديل — ${n}\n\n` + lignes.join('\n') + err
        );
      }

      case 'erreur':
        return action.message || t('Une erreur est survenue.', 'Something went wrong.', 'حدث خطأ.');

      case 'transaction_recurrente_creee': {
        const tr = action.details;
        return t(
          ok('Récurrente créée', [`**${tr.description}**`, `**Montant** : ${tr.montant} MAD`, `**Fréquence** : ${tr.frequence}`]),
          ok('Recurring created', [`**${tr.description}**`, `**Amount** : ${tr.montant}`, `**Frequency** : ${tr.frequence}`]),
          `## متكررة\n\n- ${tr.description} — ${tr.montant} / ${tr.frequence}`
        );
      }

      case 'budget_supprime':
        return t(
          ok('Budget supprimé', [action.message || 'Suppression confirmée.']),
          ok('Budget deleted', [action.message || 'Confirmed.']),
          `## تم الحذف\n\n${action.message || ''}`
        );

      case 'budget_modifie':
        return t(
          ok('Budget modifié', [action.message || 'Mise à jour confirmée.']),
          ok('Budget updated', [action.message || 'Confirmed.']),
          `## تم التعديل\n\n${action.message || ''}`
        );

      case 'objectif_supprime':
        return t(
          ok('Objectif supprimé', [action.message || 'Suppression confirmée.']),
          ok('Goal deleted', [action.message || 'Confirmed.']),
          `## تم الحذف\n\n${action.message || ''}`
        );

      case 'objectif_modifie':
        return t(
          ok('Objectif modifié', [action.message || 'Mise à jour confirmée.']),
          ok('Goal updated', [action.message || 'Confirmed.']),
          `## تم التعديل\n\n${action.message || ''}`
        );

      case 'recurrente_supprimee':
        return t(
          ok('Récurrente supprimée', [action.message || 'Suppression confirmée.']),
          ok('Recurring deleted', [action.message || 'Confirmed.']),
          `## تم الحذف\n\n${action.message || ''}`
        );

      case 'recurrente_modifiee':
        return t(
          ok('Récurrente modifiée', [action.message || 'Mise à jour confirmée.']),
          ok('Recurring updated', [action.message || 'Confirmed.']),
          `## تم التعديل\n\n${action.message || ''}`
        );

      case 'comparaison_temporelle': {
        const d = action.donnees;
        if (!d || !d.courant) {
          return t(
            'Données de comparaison indisponibles pour le moment.',
            'Comparison data is temporarily unavailable.',
            'بيانات المقارنة غير متوفرة حالياً.'
          );
        }
        const fmt = (n: number) =>
          new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' MAD';
        const ligneComparaison = (prev: number, curr: number, pct: number, labelPrev: string) => {
          if (prev === 0 && curr === 0) return `- **${labelPrev}** : 0 MAD — aucune activité sur les deux périodes`;
          if (prev === 0 && curr > 0)
            return `- **${labelPrev}** : 0 MAD → **${fmt(curr)}** ce mois *(aucune donnée sur la période de référence)*`;
          if (prev > 0) {
            const evol = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
            return `- **${labelPrev}** : ${fmt(prev)} → ${fmt(curr)} (**${evol}**)`;
          }
          return `- **${labelPrev}** : ${fmt(curr)} ce mois`;
        };
        const courant = d.courant;
        const prec = d.moisPrecedent;
        const anDer = d.anneeDerniereMemeMois;
        const dPrec = d.deltasVsMoisPrecedent;
        const dAn = d.deltasVsAnneeDerniere;
        const epargneDiffStr = (diff: number) => (diff >= 0 ? '+' : '') + fmt(diff);
        return t(
          `## Comparaison temporelle\n\n` +
            `### ${courant.label} — mois en cours\n\n` +
            `| Indicateur | Montant |\n` +
            `|------------|--------:|\n` +
            `| Revenus | ${fmt(courant.revenus)} |\n` +
            `| Dépenses | ${fmt(courant.depenses)} |\n` +
            `| Épargne nette | ${fmt(courant.epargne)} |\n\n` +
            `---\n\n` +
            `### Par rapport à ${prec.label}\n\n` +
            `${ligneComparaison(prec.revenus, courant.revenus, dPrec.revenusPct, 'Revenus')}\n` +
            `${ligneComparaison(prec.depenses, courant.depenses, dPrec.depensesPct, 'Dépenses')}\n` +
            `- **Épargne** : écart **${epargneDiffStr(dPrec.epargneDiff)}** par rapport au mois précédent\n\n` +
            `---\n\n` +
            `### Par rapport à ${anDer.label} (même mois, année dernière)\n\n` +
            `${ligneComparaison(anDer.revenus, courant.revenus, dAn.revenusPct, 'Revenus')}\n` +
            `${ligneComparaison(anDer.depenses, courant.depenses, dAn.depensesPct, 'Dépenses')}\n` +
            `- **Épargne** : écart **${epargneDiffStr(dAn.epargneDiff)}** par rapport à l'année dernière\n`,
          `## Time comparison\n\n### ${courant.label} (current)\n\n| | |\n|--|--:|\n| Income | ${fmt(courant.revenus)} |\n| Expenses | ${fmt(courant.depenses)} |\n| Net savings | ${fmt(courant.epargne)} |\n\n### vs ${prec.label}\n\n${ligneComparaison(prec.revenus, courant.revenus, dPrec.revenusPct, 'Income')}\n${ligneComparaison(prec.depenses, courant.depenses, dPrec.depensesPct, 'Expenses')}\nSavings diff: **${epargneDiffStr(dPrec.epargneDiff)}**\n\n### vs ${anDer.label}\n\n${ligneComparaison(anDer.revenus, courant.revenus, dAn.revenusPct, 'Income')}\n${ligneComparaison(anDer.depenses, courant.depenses, dAn.depensesPct, 'Expenses')}\nSavings diff: **${epargneDiffStr(dAn.epargneDiff)}**`,
          `## مقارنة زمنية\n\n### ${courant.label}\n\n- الإيرادات: ${fmt(courant.revenus)}\n- المصاريف: ${fmt(courant.depenses)}\n- الادخار: ${fmt(courant.epargne)}\n\n### مقارنة بالشهر الماضي\n\nفرق الادخار: **${epargneDiffStr(dPrec.epargneDiff)}**`
        );
      }

      case 'statistiques': {
        const stats = action.donnees;
        const tx = (stats.tauxEpargne != null && typeof stats.tauxEpargne === 'number')
          ? stats.tauxEpargne.toFixed(1)
          : '—';
        return t(
          `## Synthèse du mois\n\n| Indicateur | Valeur |\n|------------|--------:|\n| **Solde actuel** | ${stats.solde} |\n| **Revenus** | ${stats.revenus} |\n| **Dépenses** | ${stats.depenses} |\n| **Épargne (net)** | ${stats.epargne != null ? stats.epargne : (Number(stats.revenus) - Number(stats.depenses))} |\n| **Taux d'épargne** | ${tx}% |`,
          `## Monthly summary\n\n| | |\n|--|--:|\n| **Balance** | ${stats.solde} |\n| **Income** | ${stats.revenus} |\n| **Expenses** | ${stats.depenses} |\n| **Savings rate** | ${tx}% |`,
          `## ملخص\n\n- الرصيد: ${stats.solde}\n- الدخل: ${stats.revenus}\n- المصاريف: ${stats.depenses}\n- نسبة الادخار: ${tx}%`
        );
      }

      case 'objectifs_trouves':
        if (action.nombre === 0) {
          return t(
            '> Aucun objectif pour l’instant.\n\nCréez un objectif depuis la page **Objectifs** ou dites-moi par exemple : *« objectif vacances 10 000 d’ici décembre »*.',
            '> No goals yet.\n\nCreate one from the Goals page or say e.g. *"vacation goal 10000 by December"*.',
            '> لا أهداف بعد.'
          );
        }
        const fmtMad = (n: number) =>
          new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(Math.round(n));
        const objectifsDetails = action.objectifs.map((o: any) => {
          const montantRestant = Math.max(0, o.montantCible - o.montantActuel);
          const mensuel = Math.ceil(o.progression.montantMensuelRequis);
          const dateLim = o.dateLimite ? new Date(o.dateLimite).toLocaleDateString('fr-FR') : '';
          const pct = o.progression.pourcentageComplete.toFixed(1);
          return {
            fr:
              `### ${o.nom}\n\n` +
              `- **Progression** : ${fmtMad(o.montantActuel)} / ${fmtMad(o.montantCible)} MAD (${pct}%)\n` +
              `- **Reste à épargner** : ${fmtMad(montantRestant)} MAD\n` +
              (dateLim ? `- **Échéance** : ${dateLim}\n` : '') +
              `- **Recommandation** : ~**${fmtMad(mensuel)} MAD/mois** pour tenir la date limite\n\n---\n\n`,
            en:
              `### ${o.nom}\n\n` +
              `- **Progress** : ${fmtMad(o.montantActuel)} / ${fmtMad(o.montantCible)} MAD (${pct}%)\n` +
              `- **Remaining** : ${fmtMad(montantRestant)} MAD\n` +
              (dateLim ? `- **Deadline** : ${dateLim}\n` : '') +
              `- **Recommendation** : ~**${fmtMad(mensuel)} MAD/month**\n\n---\n\n`,
            ar:
              `### ${o.nom}\n\n` +
              `- **التقدم** : ${fmtMad(o.montantActuel)} / ${fmtMad(o.montantCible)} MAD\n` +
              `- **توصية شهرية** : ~${fmtMad(mensuel)} درهم\n\n---\n\n`
          };
        });
        const objectifsTexte = objectifsDetails
          .map((o: { en: any; ar: any; fr: any; }) => (langue === 'en' ? o.en : langue === 'ar' ? o.ar : o.fr))
          .join('');
        return t(
          `## Vos objectifs (${action.nombre})\n\n${objectifsTexte}`,
          `## Your goals (${action.nombre})\n\n${objectifsTexte}`,
          `## أهدافك (${action.nombre})\n\n${objectifsTexte}`
        );

      case 'habitudes_analysees':
        if (!action.categories || action.categories.length === 0) {
          return t(
            '> Pas assez de dépenses enregistrées pour une analyse.\n\nAjoutez quelques transactions **dépense** puis redemandez une analyse des habitudes.',
            '> Not enough expenses to analyse yet.',
            '> بيانات غير كافية.'
          );
        }
        const periodeText = action.periode === '3_mois'
          ? t('3 derniers mois', 'last 3 months', 'آخر 3 أشهر')
          : t('mois en cours', 'current month', 'هذا الشهر');
        const catRows = action.categories
          .map((cat: any, index: number) =>
            `| ${index + 1} | ${cat.categorie} | ${cat.montant.toFixed(0)} | ${cat.pourcentage.toFixed(1)}% |`
          )
          .join('\n');
        return t(
          `## Où vous dépensez le plus (${periodeText})\n\n| # | Catégorie | Montant | Part |\n|--:|:----------|--------:|:-----|\n${catRows}\n\n*${action.categories.length} catégorie(s) prises en compte.*`,
          `## Where you spend most (${periodeText})\n\n| # | Category | Amount | Share |\n|--:|:---------|-------:|:------|\n${catRows}`,
          `## أين تنفق أكثر\n\n${catRows}`
        );

      default:
        return t(
          '> Action enregistrée.\n\nSi quelque chose ne s’affiche pas comme prévu, précisez votre demande (ex. *mes budgets*, *solde du mois*).',
          '> Action completed.\n\nIf something looks off, try rephrasing (e.g. *my budgets*, *this month balance*).',
          '> تم التنفيذ.'
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
          max_tokens: 3000
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
