const pinecone = require("@pinecone-database/pinecone");
const generative_ai = require("@google/generative-ai");
class VectorService {
    static async init() {
        if (this.pc)
            return;
        if (!process.env.PINECONE_API_KEY) {
            console.warn('[VectorService] ⚠️ PINECONE_API_KEY manquante. Sémantique IA désactivée.');
            return;
        }
        this.pc = new pinecone.Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
        this.indexName = process.env.PINECONE_INDEX_NAME || 'hssabaty-vectors';
        if (process.env.GEMINI_API_KEY) {
            this.gemini = new generative_ai.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
    }
    static async genererEmbedding(texte) {
        if (!this.gemini) {
            console.error('[VectorService] Gemini non configuré pour les embeddings');
            return [];
        }
        try {
            const model = this.gemini.getGenerativeModel({ model: 'models/gemini-embedding-001' });
            const result = await model.embedContent(texte);
            return result.embedding.values.slice(0, 1536);
        }
        catch (error) {
            console.error('[VectorService] Erreur lors de la génération de l\'embedding:', error);
            return [];
        }
    }
    // Synchronise une transaction vers Pinecone
    static async upsertTransaction(t) {
        await this.init();
        if (!this.pc)
            return;
        const texteATransformer = `Transaction: ${t.description}. Montant: ${t.montant} MAD. Catégorie: ${t.categorie}. Type: ${t.type}. Date: ${t.date.toISOString()}.`;
        const vector = await this.genererEmbedding(texteATransformer);
        if (vector.length === 0)
            return;
        const index = this.pc.index(this.indexName);
        await index.upsert({
            records: [
                {
                    id: t._id.toString(),
                    values: vector,
                    metadata: {
                        utilisateurId: t.utilisateurId.toString(),
                        description: t.description,
                        montant: t.montant,
                        categorie: t.categorie,
                        type: t.type,
                        date: t.date.toISOString()
                    }
                }
            ]
        });
        console.log(`[VectorService] ✅ Transaction ${t._id} synchronisée (Pinecone)`);
    }
    static async supprimerTransaction(transactionId) {
        await this.init();
        if (!this.pc)
            return;
        try {
            const index = this.pc.index(this.indexName);
            await index.deleteOne(transactionId);
            console.log(`[VectorService] 🗑️ Transaction ${transactionId} supprimée de Pinecone`);
        }
        catch (e) {
            console.error('[VectorService] Erreur lors de la suppression Pinecone:', e);
        }
    }
    static async rechercherSimilaires(utilisateurId, requete, limite = 5) {
        await this.init();
        if (!this.pc)
            return [];
        const vector = await this.genererEmbedding(requete);
        if (vector.length === 0)
            return [];
        try {
            const index = this.pc.index(this.indexName);
            const queryResponse = await index.query({
                vector: vector,
                topK: limite,
                includeMetadata: true,
                filter: {
                    utilisateurId: { '$eq': utilisateurId }
                }
            });
            return queryResponse.matches.map(m => ({
                id: m.id,
                ...m.metadata
            }));
        }
        catch (error) {
            console.error('[VectorService] Erreur lors de la recherche sémantique:', error);
            return [];
        }
    }
}
exports.VectorService = VectorService;
