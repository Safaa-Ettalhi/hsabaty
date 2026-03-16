import { ServiceAgentIA } from '../agentIA';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Conversation } from '../../models/Conversation';
import mongoose from 'mongoose';

void mongoose;

jest.mock('openai');
jest.mock('@anthropic-ai/sdk');
jest.mock('@google/generative-ai');
jest.mock('../../models/Conversation');
jest.mock('../../models/Transaction');
jest.mock('../../models/Budget');
jest.mock('../../models/Objectif');
jest.mock('../../models/Utilisateur');

describe('ServiceAgentIA', () => {
    let service: ServiceAgentIA;
    let mockStartChat: jest.Mock;
    let mockSendMessage: jest.Mock;
    let mockGetGenerativeModel: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.IA_PROVIDER = 'gemini';
        process.env.GEMINI_API_KEY = 'test-key';
        process.env.IA_MODEL = 'gemini-pro';

        mockSendMessage = jest.fn().mockResolvedValue({
            response: {
                text: () => 'AI Response'
            }
        });

        mockStartChat = jest.fn().mockReturnValue({
            sendMessage: mockSendMessage
        });
        
        mockGetGenerativeModel = jest.fn().mockReturnValue({
            startChat: mockStartChat
        });

        (GoogleGenerativeAI as unknown as jest.Mock).mockImplementation(() => ({
            getGenerativeModel: mockGetGenerativeModel
        }));

        (Conversation.findOne as jest.Mock).mockResolvedValue({
            messages: [],
            save: jest.fn(),
            _id: 'conv123'
        });

    });

    it('should initialize with Gemini provider', () => {
        service = new ServiceAgentIA();
        expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-key');
    });

    it('should process message with Gemini successfully', async () => {
        service = new ServiceAgentIA();
        
        const obtenirContexteUtilisateurSpy = jest.spyOn(service as any, 'obtenirContexteUtilisateur').mockResolvedValue({
            transactions: [],
            budgets: [],
            objectifs: []
        });
        jest.spyOn(service as any, 'construirePromptSystem').mockReturnValue('System Prompt');
        jest.spyOn(service as any, 'sauvegarderMessage').mockResolvedValue('conv123');
        jest.spyOn(service as any, 'extraireActionDepuisReponse').mockReturnValue(null);
        jest.spyOn(service as any, 'detecterIntention').mockReturnValue(null);

        const result = await service.traiterMessage('user1', 'Hello');

        expect(obtenirContexteUtilisateurSpy).toHaveBeenCalled();
        expect(mockGetGenerativeModel).toHaveBeenCalled();
        expect(mockStartChat).toHaveBeenCalled();
        expect(mockSendMessage).toHaveBeenCalledWith('Hello');
        expect(result.reponse).toBe('AI Response');
    });
});
