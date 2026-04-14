import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const updateDevUrl = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/onze-motores');
    console.log('📦 Conectado ao MongoDB');

    const result = await mongoose.connection.db.collection('appconfigs').updateOne(
      { key: 'settings' },
      { 
        $set: { 
          'api.development.url': '192.168.1.4',
          'api.development.port': 4882
        } 
      }
    );

    console.log('✅ URL de desenvolvimento atualizada:', result);
    
    // Verificar o que foi salvo
    const config = await mongoose.connection.db.collection('appconfigs').findOne({ key: 'settings' });
    console.log('📋 Configuração atual:', JSON.stringify(config.api, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
};

updateDevUrl();
