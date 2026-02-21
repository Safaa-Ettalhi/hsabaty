/**
 * Valide les variables d'environnement requises au démarrage.
 * À appeler après dotenv.config().
 */
export function validerEnv(): void {
  const manquantes: string[] = [];
  const recommandations: string[] = [];

  if (!process.env.MONGODB_URI?.trim()) {
    manquantes.push('MONGODB_URI');
  }

  if (!process.env.SESSION_SECRET?.trim()) {
    manquantes.push('SESSION_SECRET');
  }

  if (manquantes.length > 0) {
    throw new Error(
      `Variables d'environnement requises manquantes: ${manquantes.join(', ')}. ` +
      'Vérifiez votre fichier .env (voir .env.example).'
    );
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET?.trim() || process.env.JWT_SECRET === 'changez-moi-en-production') {
      recommandations.push('JWT_SECRET doit être défini et sécurisé en production');
    }
    if (!process.env.CORS_ORIGIN?.trim()) {
      recommandations.push('CORS_ORIGIN doit être défini en production');
    }
    if (recommandations.length > 0) {
      console.warn('[validateEnv] Production: ' + recommandations.join(' ; '));
    }
  }
}
