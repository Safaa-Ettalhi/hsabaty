jest.mock("@pinecone-database/pinecone", () => ({
  Pinecone: jest.fn(),
}));
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn(),
}));

const vectorService = require("../vectorService");
const pinecone = require("@pinecone-database/pinecone");
const generative_ai = require("@google/generative-ai");
describe('VectorService', () => {
    let mockIndex;
    let mockEmbedContent;
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.PINECONE_API_KEY = 'test-key';
        process.env.GEMINI_API_KEY = 'gemini-key';
        process.env.PINECONE_INDEX_NAME = 'test-index';
        mockIndex = {
            upsert: jest.fn().mockResolvedValue(undefined),
            query: jest.fn().mockResolvedValue({ matches: [] }),
            deleteOne: jest.fn().mockResolvedValue(undefined)
        };
        pinecone.Pinecone.mockImplementation(() => ({
            index: jest.fn().mockReturnValue(mockIndex)
        }));
        mockEmbedContent = jest.fn().mockResolvedValue({
            embedding: { values: [0.1, 0.2, 0.3] }
        });
        generative_ai.GoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
                embedContent: mockEmbedContent
            })
        }));
    });
    describe('upsertTransaction', () => {
        it('should generate embedding and upsert to pinecone', async () => {
            const mockTransaction = {
                _id: 'trans1',
                utilisateurId: 'user1',
                description: 'test',
                montant: 100,
                categorie: 'cat',
                type: 'depense',
                date: new Date()
            };
            await vectorService.VectorService.upsertTransaction(mockTransaction);
            expect(pinecone.Pinecone).toHaveBeenCalled();
            expect(generative_ai.GoogleGenerativeAI).toHaveBeenCalled();
            expect(mockEmbedContent).toHaveBeenCalled();
            expect(mockIndex.upsert).toHaveBeenCalledWith(expect.objectContaining({
                records: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'trans1',
                        values: [0.1, 0.2, 0.3]
                    })
                ])
            }));
        });
        it('should do nothing if PINECONE_API_KEY is missing', async () => {
            delete process.env.PINECONE_API_KEY;
            vectorService.VectorService.pc = undefined;
            await vectorService.VectorService.upsertTransaction({});
            expect(mockIndex.upsert).not.toHaveBeenCalled();
        });
    });
    describe('rechercherSimilaires', () => {
        it('should return search results', async () => {
            vectorService.VectorService.pc = undefined;
            process.env.PINECONE_API_KEY = 'key';
            mockIndex.query.mockResolvedValue({
                matches: [{ id: 'trans1', score: 0.9, metadata: { description: 'match' } }]
            });
            await vectorService.VectorService.rechercherSimilaires('user1', 'query');
            expect(mockIndex.query).toHaveBeenCalled();
        });
    });
});
