const rapportMensuelService = require("../rapportMensuelService");
const Utilisateur = require("../../models/Utilisateur");
const calculsFinanciers = require("../calculsFinanciers");
const exportService = require("../exportService");
const emailService = require("../emailService");
jest.mock('../../models/Utilisateur');
jest.mock('../calculsFinanciers');
jest.mock('../exportService');
jest.mock('../emailService');
describe('RapportMensuelService', () => {
    const mockUser = {
        _id: 'user123',
        nom: 'Test User',
        email: 'test@example.com'
    };
    beforeEach(() => {
        jest.clearAllMocks();
        Utilisateur.Utilisateur.findById.mockResolvedValue(mockUser);
        Utilisateur.Utilisateur.find.mockResolvedValue([mockUser]);
        calculsFinanciers.ServiceCalculsFinanciers.prototype.calculerRevenus.mockResolvedValue(1000);
        calculsFinanciers.ServiceCalculsFinanciers.prototype.calculerDepenses.mockResolvedValue(500);
    });
    it('genererEtEnvoyerRapportMensuel should work', async () => {
        calculsFinanciers.ServiceCalculsFinanciers.prototype.calculerTauxEpargne = jest.fn().mockResolvedValue(0.5);
        calculsFinanciers.ServiceCalculsFinanciers.prototype.obtenirRepartitionDepenses = jest.fn().mockResolvedValue([]);
        calculsFinanciers.ServiceCalculsFinanciers.prototype.obtenirTopDepenses = jest.fn().mockResolvedValue([]);
        exportService.ExportService.exporterRapportPDF.mockResolvedValue(Buffer.from('pdf content'));
        emailService.EmailService.envoyerRapport.mockResolvedValue(undefined);
        await rapportMensuelService.RapportMensuelService.genererEtEnvoyerRapportMensuel('user123', 5, 2023);
        expect(Utilisateur.Utilisateur.findById).toHaveBeenCalledWith('user123');
        expect(calculsFinanciers.ServiceCalculsFinanciers.prototype.calculerRevenus).toHaveBeenCalled();
        expect(exportService.ExportService.exporterRapportPDF).toHaveBeenCalled();
        expect(emailService.EmailService.envoyerRapport).toHaveBeenCalledWith(mockUser.email, mockUser.nom, expect.anything(), 'mensuel');
    });
    it('genererRapportsMensuelsPourTous should iterate users', async () => {
        const spy = jest.spyOn(rapportMensuelService.RapportMensuelService, 'genererEtEnvoyerRapportMensuel').mockResolvedValue();
        await rapportMensuelService.RapportMensuelService.genererRapportsMensuelsPourTous();
        expect(Utilisateur.Utilisateur.find).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(mockUser._id.toString());
    });
});
