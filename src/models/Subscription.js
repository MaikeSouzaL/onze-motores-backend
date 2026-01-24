import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true, index: true },
  
  status: {
    type: String,
    enum: ['free', 'active', 'canceled', 'expired', 'past_due'],
    default: 'free',
    required: true,
  },
  
  plan: {
    type: String,
    enum: ['monthly', 'annual', null],
    default: null,
  },
  
  // Datas de Vigência
  startDate: { type: Date },
  endDate: { type: Date },
  
  // Integração Stripe
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  stripePriceId: { type: String },
  
  // Controle de Trial
  trial: {
    isTrial: { type: Boolean, default: false },
    trialStartDate: { type: Date },
    trialEndDate: { type: Date },
    trialUsed: { type: Boolean, default: false }, // Se já usou o trial alguma vez
    trialWelcomeShown: { type: Boolean, default: false }, // Se já viu o modal de boas-vindas
  },
  
  // Controle de UI
  flags: {
    welcomeShown: { type: Boolean, default: false },
    premiumWelcomeShown: { type: Boolean, default: false },
  },

}, {
  timestamps: true,
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
