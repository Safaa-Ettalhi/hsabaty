import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connecterBaseDeDonnees = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hssabaty';
    
    await mongoose.connect(mongoUri);
    
    console.log('Connexion à MongoDB réussie');
    
    mongoose.connection.on('error', (err) => {
      console.error('Erreur MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB déconnecté');
    });
    
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
};
