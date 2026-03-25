const Utilisateur = require("../models/Utilisateur");
const calculsFinanciers = require("./calculsFinanciers");
const exportService = require("./exportService");
const emailService = require("./emailService");
const date_fns = require("date-fns");
const serviceCalculs = new calculsFinanciers.ServiceCalculsFinanciers();

function periodeMois(mois, annee) {
    const maintenant = new Date();
    const date = mois && annee ? new Date(annee, mois - 1, 1) : date_fns.subMonths(maintenant, 1);
    return { date, debut: date_fns.startOfMonth(date), fin: date_fns.endOfMonth(date) };
}

class RapportMensuelService {
    //générer et envoyer le rapport mensuel pour un utilisateur
    static async genererEtEnvoyerRapportMensuel(utilisateurId, mois, annee) {
        const utilisateur = await Utilisateur.Utilisateur.findById(utilisateurId);
        if (!utilisateur) {
            return;
        }
        const { date, debut, fin } = periodeMois(mois, annee);
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
        const pdfBuffer = await exportService.ExportService.exporterRapportPDF(titre, donnees, utilisateurId);
        await emailService.EmailService.envoyerRapport(utilisateur.email, utilisateur.nom, pdfBuffer, 'mensuel');
    }
    //générer les rapports mensuels pour tous les utilisateurs
    static async genererRapportsMensuelsPourTous() {
        const utilisateurs = await Utilisateur.Utilisateur.find();
        console.log(` Génération de ${utilisateurs.length} rapport(s) mensuel(s)...`);
        for (const utilisateur of utilisateurs) {
            try {
                await this.genererEtEnvoyerRapportMensuel(utilisateur._id.toString());
                console.log(` Rapport mensuel envoyé à ${utilisateur.email}`);
            }
            catch (error) {
                console.error(` Erreur lors de l'envoi du rapport à ${utilisateur.email}:`, error);
            }
        }
    }
}
exports.RapportMensuelService = RapportMensuelService;
