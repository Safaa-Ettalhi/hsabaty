import { Utilisateur } from '../models/Utilisateur';
import { ServiceCalculsFinanciers } from './calculsFinanciers';
import { ExportService } from './exportService';
import { EmailService } from './emailService';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const serviceCalculs = new ServiceCalculsFinanciers();


export class RapportMensuelService {
//générer et envoyer le rapport mensuel pour un utilisateur
  static async genererEtEnvoyerRapportMensuel(utilisateurId: string, mois?: number, annee?: number): Promise<void> {
    const utilisateur = await Utilisateur.findById(utilisateurId);
    if (!utilisateur || !utilisateur.preferences.notificationsEmail) {
      return;
    }

    const maintenant = new Date();
    const date = mois && annee
      ? new Date(annee, mois - 1, 1)
      : subMonths(maintenant, 1); 

    const debut = startOfMonth(date);
    const fin = endOfMonth(date);

    const revenus = await serviceCalculs.calculerRevenus(utilisateurId, debut, fin);
    const depenses = await serviceCalculs.calculerDepenses(utilisateurId, debut, fin);
    const epargne = revenus - depenses;
    const tauxEpargne = await serviceCalculs.calculerTauxEpargne(utilisateurId, debut, fin);
    const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(utilisateurId, debut, fin);
    const topDepenses = await serviceCalculs.obtenirTopDepenses(utilisateurId, debut, fin, 10);

    const donnees = {
      resume: { revenus, depenses, epargne, tauxEpargne },
      repartitionDepenses,
      topDepenses
    };

    const titre = `Rapport Mensuel - ${date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    const pdfBuffer = await ExportService.exporterRapportPDF(titre, donnees, utilisateurId);

    await EmailService.envoyerRapport(
      utilisateur.email,
      utilisateur.nom,
      pdfBuffer,
      'mensuel'
    );
  }

//générer les rapports mensuels pour tous les utilisateurs
  static async genererRapportsMensuelsPourTous(): Promise<void> {
    const utilisateurs = await Utilisateur.find({
      'preferences.notificationsEmail': true
    });

    console.log(` Génération de ${utilisateurs.length} rapport(s) mensuel(s)...`);

    for (const utilisateur of utilisateurs) {
      try {
        await this.genererEtEnvoyerRapportMensuel(utilisateur._id.toString());
        console.log(` Rapport mensuel envoyé à ${utilisateur.email}`);
      } catch (error) {
        console.error(` Erreur lors de l'envoi du rapport à ${utilisateur.email}:`, error);
      }
    }
  }
}
