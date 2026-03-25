const agentIA = require("../agentIA");
const generative_ai = require("@google/generative-ai");
const Conversation = require("../../models/Conversation");
const mongoose = require("mongoose");
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
    let service;
    let mockStartChat;
    let mockSendMessage;
    let mockGetGenerativeModel;
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
        generative_ai.GoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: mockGetGenerativeModel
        }));
        Conversation.Conversation.findOne.mockResolvedValue({
            messages: [],
            save: jest.fn(),
            _id: 'conv123'
        });
    });
    it('should initialize with Gemini provider', () => {
        service = new agentIA.ServiceAgentIA();
        expect(generative_ai.GoogleGenerativeAI).toHaveBeenCalledWith('test-key');
    });
    it('should process message with Gemini successfully', async () => {
        service = new agentIA.ServiceAgentIA();
        const obtenirContexteUtilisateurSpy = jest.spyOn(service, 'obtenirContexteUtilisateur').mockResolvedValue({
            transactions: [],
            budgets: [],
            objectifs: []
        });
        jest.spyOn(service, 'construirePromptSystem').mockReturnValue('System Prompt');
        jest.spyOn(service, 'sauvegarderMessage').mockResolvedValue('conv123');
        jest.spyOn(service, 'extraireActionDepuisReponse').mockReturnValue(null);
        jest.spyOn(service, 'detecterIntention').mockReturnValue(null);
        const result = await service.traiterMessage('user1', 'Hello');
        expect(obtenirContexteUtilisateurSpy).toHaveBeenCalled();
        expect(mockGetGenerativeModel).toHaveBeenCalled();
        expect(mockStartChat).toHaveBeenCalled();
        expect(mockSendMessage).toHaveBeenCalledWith('Hello');
        expect(result.reponse).toBe('AI Response');
    });
});
