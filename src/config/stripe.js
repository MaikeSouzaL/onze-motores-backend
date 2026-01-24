/**
 * Configuração do Stripe
 */

import Stripe from 'stripe';
import { config } from './index.js';

let stripeInstance = null;

export function getStripeInstance() {
  if (!stripeInstance) {
    if (!config.stripe.secretKey) {
      throw new Error('STRIPE_SECRET_KEY não configurada');
    }
    
    stripeInstance = new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-11-20.acacia',
    });
    
    console.log('✅ Stripe inicializado com sucesso');
  }
  
  return stripeInstance;
}

