import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AppConfig from './src/models/AppConfig.js';

dotenv.config();

const configData = {
  key: 'settings',
  api: {
    development: {
      port: 4882,
      // 🔧 ESCOLHA O IP CORRETO:
      // Para EMULADOR ANDROID: use "10.0.2.2"
      // Para DISPOSITIVO FÍSICO: use "192.168.1.10" (seu IP Wi-Fi)
      // Para iOS SIMULATOR: use "localhost"
      url: "192.168.1.10" // ← DISPOSITIVO FÍSICO (mesma rede Wi-Fi)
      // url: "10.0.2.2"   // ← Descomente para EMULADOR ANDROID
    },
    production: {
      port: 4882,
      url: "api.onzemotores.com.br"
    },
    useProduction: true // Mude para false para usar local
  },
  freeTier: {
    canAccessEsquemas: true,
    canEditMotors: true,
    canGenerateGarantia: false,
    canGenerateLaudo: false,
    canGenerateOrcamento: false,
    canGeneratePDF: false,
    canGenerateRecibo: false,
    canOnlySeeOwnMotors: true,
    canRegisterMotors: false,
    canViewMotors: true,
    maxMotors: 3
  },
  freeTrial: {
    days: 7,
    enabled: true
  },
  general: {
    appName: "Onze Motores",
    blockMotorsForFree: false,
    forceUpdate: false,
    maintenanceMode: false,
    minVersion: "1.0.0"
  },
  paidTier: {
    canAccessEsquemas: true,
    canEditMotors: true,
    canGenerateGarantia: true,
    canGenerateLaudo: true,
    canGenerateOrcamento: true,
    canGeneratePDF: true,
    canGenerateRecibo: true,
    canOnlySeeOwnMotors: false,
    canRegisterMotors: true,
    canViewMotors: true,
    maxMotors: "unlimited"
  },
  pricing: {
    annual: 288,
    annualDiscountPercent: 20,
    monthly: 29.9,
    useDynamicPricing: true
  }
};

const seedConfig = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Conectado ao MongoDB');

    // Tentar atualizar se existir, ou criar novo
    const result = await AppConfig.findOneAndUpdate(
      { key: 'settings' },
      configData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('✅ Configurações salvas com sucesso:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao salvar configurações:', error);
    process.exit(1);
  }
};

seedConfig();
