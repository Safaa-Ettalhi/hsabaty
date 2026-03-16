import { RapportMensuelService } from '../rapportMensuelService';
import { Utilisateur } from '../../models/Utilisateur';
import { ServiceCalculsFinanciers } from '../calculsFinanciers';
import { ExportService } from '../exportService';
import { EmailService } from '../emailService';

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
        (Utilisateur.findById as jest.Mock).mockResolvedValue(mockUser);
        (Utilisateur.find as jest.Mock).mockResolvedValue([mockUser]);

        (ServiceCalculsFinanciers.prototype.calculerRevenus as jest.Mock).mockResolvedValue(1000);
        (ServiceCalculsFinanciers.prototype.calculerDepenses as jest.Mock).mockResolvedValue(500);

    });

    it('genererEtEnvoyerRapportMensuel should work', async () => {

        (ServiceCalculsFinanciers.prototype as any).calculerTauxEpargne = jest.fn().mockResolvedValue(0.5);
        (ServiceCalculsFinanciers.prototype as any).obtenirRepartitionDepenses = jest.fn().mockResolvedValue([]);
        (ServiceCalculsFinanciers.prototype as any).obtenirTopDepenses = jest.fn().mockResolvedValue([]);

        (ExportService.exporterRapportPDF as jest.Mock).mockResolvedValue(Buffer.from('pdf content'));
        (EmailService.envoyerRapport as jest.Mock).mockResolvedValue(undefined);

        await RapportMensuelService.genererEtEnvoyerRapportMensuel('user123', 5, 2023);

        expect(Utilisateur.findById).toHaveBeenCalledWith('user123');
        expect(ServiceCalculsFinanciers.prototype.calculerRevenus).toHaveBeenCalled();
        expect(ExportService.exporterRapportPDF).toHaveBeenCalled();
        expect(EmailService.envoyerRapport).toHaveBeenCalledWith(
            mockUser.email,
            mockUser.nom,
            expect.anything(),
            'mensuel'
        );
    });

    it('genererRapportsMensuelsPourTous should iterate users', async () => {
        const spy = jest.spyOn(RapportMensuelService, 'genererEtEnvoyerRapportMensuel').mockResolvedValue();
        
        await RapportMensuelService.genererRapportsMensuelsPourTous();

        expect(Utilisateur.find).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(mockUser._id.toString());
    });
});
