import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

//envoyer un email
  static async envoyerEmail(
    destinataire: string,
    sujet: string,
    contenu: string,
    pieceJointe?: { filename: string; content: Buffer; contentType: string }
  ): Promise<void> {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn(' Configuration SMTP manquante. Email non envoyé.');
      return;
    }

    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    const mailOptions: any = {
      from: `"Hssabaty" <${fromEmail}>`,
      to: destinataire,
      subject: sujet,
      html: contenu
    };

    if (pieceJointe) {
      mailOptions.attachments = [{
        filename: pieceJointe.filename,
        content: pieceJointe.content,
        contentType: pieceJointe.contentType
      }];
    }

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(` Email envoyé à ${destinataire}`);
    } catch (error: any) {
      console.error(' Erreur lors de l\'envoi de l\'email:', error);
      
      if (error?.responseCode === 550 && error?.response?.includes('Sender Identity')) {
        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
        throw new Error(
          `SendGrid: L'adresse d'expéditeur "${fromEmail}" n'est pas vérifiée. ` +
          `Allez sur https://sendgrid.com/docs/for-developers/sending-email/sender-identity/ ` +
          `pour vérifier votre identité d'expéditeur dans SendGrid.`
        );
      }
      
      throw error;
    }
  }

//envoyer un rapport par email
  static async envoyerRapport(
    email: string,
    nomUtilisateur: string,
    rapportPDF: Buffer,
    typeRapport: string
  ): Promise<void> {
    const sujet = `Votre rapport ${typeRapport} - Hssabaty`;
    const contenu = `
      <h2>Bonjour ${nomUtilisateur},</h2>
      <p>Veuillez trouver ci-joint votre rapport ${typeRapport} généré le ${new Date().toLocaleDateString('fr-FR')}.</p>
      <p>Cordialement,<br>L'équipe Hssabaty</p>
    `;

    await this.envoyerEmail(
      email,
      sujet,
      contenu,
      {
        filename: `rapport_${typeRapport}_${Date.now()}.pdf`,
        content: rapportPDF,
        contentType: 'application/pdf'
      }
    );
  }

//envoyer une alerte budgétaire
  static async envoyerAlerteBudget(
    email: string,
    nomUtilisateur: string,
    nomBudget: string,
    pourcentageUtilise: number,
    montantRestant: number
  ): Promise<void> {
    const sujet = pourcentageUtilise >= 100 
      ? ` Budget "${nomBudget}" dépassé - Hssabaty`
      : ` Alerte Budget "${nomBudget}" - Hssabaty`;

    const contenu = `
      <h2>Bonjour ${nomUtilisateur},</h2>
      <p>Nous vous informons que votre budget <strong>"${nomBudget}"</strong> a atteint <strong>${pourcentageUtilise.toFixed(2)}%</strong>.</p>
      ${pourcentageUtilise >= 100 
        ? '<p style="color: red;"><strong> Votre budget a été dépassé!</strong></p>'
        : `<p>Il vous reste <strong>${montantRestant.toFixed(2)} MAD</strong>.</p>`
      }
      <p>Cordialement,<br>L'équipe Hssabaty</p>
    `;

    await this.envoyerEmail(email, sujet, contenu);
  }

//envoyer une notification de transaction récurrente
  static async envoyerRappelTransactionRecurrente(
    email: string,
    nomUtilisateur: string,
    description: string,
    montant: number,
    dateEcheance: Date
  ): Promise<void> {
    const sujet = ` Rappel: Transaction récurrente à venir - Hssabaty`;
    const contenu = `
      <h2>Bonjour ${nomUtilisateur},</h2>
      <p>Nous vous rappelons qu'une transaction récurrente est prévue:</p>
      <ul>
        <li><strong>Description:</strong> ${description}</li>
        <li><strong>Montant:</strong> ${montant.toFixed(2)} MAD</li>
        <li><strong>Date d'échéance:</strong> ${dateEcheance.toLocaleDateString('fr-FR')}</li>
      </ul>
      <p>Cordialement,<br>L'équipe Hssabaty</p>
    `;

    await this.envoyerEmail(email, sujet, contenu);
  }
}
