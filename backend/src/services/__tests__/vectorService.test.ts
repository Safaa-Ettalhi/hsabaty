import { VectorService } from '../vectorService';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('@pinecone-database/pinecone');
jest.mock('@google/generative-ai');

describe('VectorService', () => {
    let mockIndex: any;
    let mockEmbedContent: jest.Mock;

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

        (Pinecone as unknown as jest.Mock).mockImplementation(() => ({
            index: jest.fn().mockReturnValue(mockIndex)
        }));

        mockEmbedContent = jest.fn().mockResolvedValue({
            embedding: { values: [0.1, 0.2, 0.3] }
        });

        (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => ({
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

            await VectorService.upsertTransaction(mockTransaction as any);

            expect(Pinecone).toHaveBeenCalled();
            expect(GoogleGenerativeAI).toHaveBeenCalled();
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
            (VectorService as any).pc = undefined;

            await VectorService.upsertTransaction({} as any);

            expect(mockIndex.upsert).not.toHaveBeenCalled();
        });
    });

    describe('rechercherSimilaires', () => {
        it('should return search results', async () => {
            (VectorService as any).pc = undefined; 
            process.env.PINECONE_API_KEY = 'key'; 
            
            mockIndex.query.mockResolvedValue({
                matches: [{ id: 'trans1', score: 0.9, metadata: { description: 'match' } }]
            });

            await VectorService.rechercherSimilaires('user1', 'query');

            expect(mockIndex.query).toHaveBeenCalled();
        });
    });
});
