import mongoose from 'mongoose';

const appConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'settings' }, // Singleton
  
  api: {
    useProduction: { type: Boolean, default: true },
    production: {
      url: { type: String },
      port: { type: Number },
    },
    development: {
      url: { type: String },
      port: { type: Number },
    },
  },
  
  pricing: {
    monthly: { type: Number, required: true },
    annual: { type: Number, required: true },
    annualDiscountPercent: { type: Number, default: 20 },
    useDynamicPricing: { type: Boolean, default: true },
  },
  
  freeTier: {
    maxMotors: { type: Number, default: 3 },
    canRegisterMotors: { type: Boolean, default: true },
    canEditMotors: { type: Boolean, default: true },
    canViewMotors: { type: Boolean, default: true },
    canGeneratePDF: { type: Boolean, default: false },
    canGenerateOrcamento: { type: Boolean, default: false },
    canGenerateLaudo: { type: Boolean, default: false },
    canGenerateRecibo: { type: Boolean, default: false },
    canGenerateGarantia: { type: Boolean, default: false },
    canAccessEsquemas: { type: Boolean, default: true },
    canOnlySeeOwnMotors: { type: Boolean, default: true },
  },
  
  paidTier: {
    maxMotors: { type: mongoose.Schema.Types.Mixed, default: 'unlimited' }, // Number ou 'unlimited'
    canRegisterMotors: { type: Boolean, default: true },
    canEditMotors: { type: Boolean, default: true },
    canViewMotors: { type: Boolean, default: true },
    canGeneratePDF: { type: Boolean, default: true },
    canGenerateOrcamento: { type: Boolean, default: true },
    canGenerateLaudo: { type: Boolean, default: true },
    canGenerateRecibo: { type: Boolean, default: true },
    canGenerateGarantia: { type: Boolean, default: true },
    canAccessEsquemas: { type: Boolean, default: true },
    canOnlySeeOwnMotors: { type: Boolean, default: false },
  },
  
  general: {
    appName: { type: String, default: 'Onze Motores' },
    maintenanceMode: { type: Boolean, default: false },
    forceUpdate: { type: Boolean, default: false },
    minVersion: { type: String, default: '1.0.0' },
    blockMotorsForFree: { type: Boolean, default: false },
  },
  
  freeTrial: {
    enabled: { type: Boolean, default: true },
    days: { type: Number, default: 7 },
  },

}, {
  timestamps: true,
});

const AppConfig = mongoose.model('AppConfig', appConfigSchema);

export default AppConfig;
