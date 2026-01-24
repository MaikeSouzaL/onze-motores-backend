import mongoose from 'mongoose';
import dotenv from 'dotenv';
import VersionApp from './src/models/VersionApp.js';

dotenv.config();

const testQuery = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/onze-motores';
    await mongoose.connect(mongoUri);
    console.log(`📦 Conectado ao MongoDB: ${mongoUri}`);

    console.log("🔍 Buscando versão ativa...");
    const version = await VersionApp.findOne({ active: true }).sort({ createdAt: -1 });
    
    if (version) {
        console.log("✅ Versão encontrada:", version);
    } else {
        console.log("❌ Nenhuma versão encontrada (active: true)");
    }

    const allVersions = await VersionApp.find({});
    console.log(`📊 Total de versões no banco: ${allVersions.length}`);
    console.log(JSON.stringify(allVersions, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
};

testQuery();