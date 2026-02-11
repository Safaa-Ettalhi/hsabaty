import dotenv from 'dotenv';
import { connecterBaseDeDonnees } from '../config/database';
import { Admin } from '../models/Admin';

dotenv.config();

//creer le super admin
const creerSuperAdmin = async () => {
  try {
    await connecterBaseDeDonnees();

    const email = process.argv[2] || 'admin@hssabaty.com';
    const motDePasse = process.argv[3] || 'Admin123!';
    const nom = process.argv[4] || 'Super';
    const prenom = process.argv[5] || 'Admin';

    const adminExistant = await Admin.findOne({ email });
    if (adminExistant) {
      console.log('Un administrateur avec cet email existe déjà');
      process.exit(1);
    }

    const superAdmin = new Admin({
      email,
      motDePasse,
      nom,
      prenom,
      role: 'super_admin',
      actif: true
    });

    await superAdmin.save();

    console.log(' Super administrateur créé avec succès !');
    console.log(` Email: ${email}`);
    console.log(` Mot de passe: ${motDePasse}`);
    console.log('  Changez le mot de passe après la première connexion !');

    process.exit(0);
  } catch (error) {
    console.error(' Erreur lors de la création du super admin:', error);
    process.exit(1);
  }
};

creerSuperAdmin();
