const mongoose = require("mongoose");

const uriParDefaut = "mongodb://localhost:27017/hssabaty";

async function connecterBaseDeDonnees() {
  const uri = process.env.MONGODB_URI || uriParDefaut;
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB connecté");
  } catch (err) {
    console.error("❌ MongoDB: connexion impossible");
    console.error(err?.message || err);
    process.exit(1);
  }
}

async function fermerConnexion() {
  try {
    await mongoose.connection.close();
  } catch {
    // rien : fermeture best-effort
  }
}

module.exports = { connecterBaseDeDonnees, fermerConnexion };
