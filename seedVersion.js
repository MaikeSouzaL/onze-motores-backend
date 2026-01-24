import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VersionApp from './src/models/VersionApp.js';

dotenv.config();

const versionData = {
  version: "1.0.3",
  forceUpdate: false,
  active: true,
  platform: 'all',
  message: 'Nova versão disponível com melhorias de performance.'
};

const seedVersion = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/onze-motores';
    
    await mongoose.connect(mongoUri);
    console.log(`📦 Conectado ao MongoDB: ${mongoUri}`);

    // Salvar ou atualizar a versão 1.0.3
    const result = await VersionApp.findOneAndUpdate(
      { version: '1.0.3' },
      versionData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('✅ VersionApp salvo com sucesso:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao salvar VersionApp:', error);
    process.exit(1);
  }
};

seedVersion();