import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connecterBaseDeDonnees = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hissabaty';
    
    const options: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      readPreference: 'primary'
    };

    await mongoose.connect(mongoUri, options);
    
    console.log('✅ Connexion à MongoDB réussie');
    console.log(`📊 Base de données: ${mongoose.connection.name}`);
    console.log(`🔗 URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Masquer les credentials
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB déconnecté - Tentative de reconnexion...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnecté');
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connecté');
    });
    
  } catch (error: any) {
    console.error('❌ Erreur de connexion à MongoDB:', error.message);
    console.error('💡 Vérifiez que MongoDB est démarré et que MONGODB_URI est correct dans votre .env');
    process.exit(1);
  }
};

export const fermerConnexion = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('✅ Connexion MongoDB fermée proprement');
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture de MongoDB:', error);
  }
};
