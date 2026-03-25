function validerEnv() {
  const requis = ["MONGODB_URI", "SESSION_SECRET", "PINECONE_API_KEY"];
  const manquantes = requis.filter((k) => !process.env[k]?.trim());

  if (manquantes.length) {
    throw new Error(
      `Variables d'environnement manquantes: ${manquantes.join(", ")}. Vérifiez .env (.env.example).`,
    );
  }

  if (process.env.NODE_ENV === "production") {
    if (!process.env.JWT_SECRET?.trim() || process.env.JWT_SECRET === "changez-moi-en-production") {
      console.warn("[validateEnv] En prod, définis un JWT_SECRET sécurisé");
    }
    if (!process.env.CORS_ORIGIN?.trim()) {
      console.warn("[validateEnv] En prod, définis CORS_ORIGIN");
    }
  }
}

module.exports = { validerEnv };
