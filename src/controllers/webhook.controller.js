/**
 * Controller para processar webhooks do Stripe
 */

import express from 'express';
import { getStripeInstance } from '../config/stripe.js';
import { config } from '../config/index.js';
import { processStripeWebhook } from '../services/webhook.service.js';

// Middleware para capturar o raw body (necessário para validar webhook)
// Usamos type "*/*" para evitar problemas com charset (ex: application/json; charset=utf-8)
export const rawBodyMiddleware = express.raw({ type: '*/*' });

/**
 * Processar webhook do Stripe
 * 
 * POST /api/stripe/webhook
 */
export async function handleWebhook(req, res) {
  console.log('📥 Webhook recebido do Stripe');
  console.log('📋 Headers:', {
    'stripe-signature': req.headers['stripe-signature'] ? 'presente' : 'ausente',
    'content-type': req.headers['content-type'],
  });

  const stripe = getStripeInstance();
  const signature = req.headers['stripe-signature'];
  // Suporta múltiplos secrets separados por vírgula (para vários destinos/ambientes)
  const webhookSecretRaw = config.stripe.webhookSecret;
  const webhookSecrets = (webhookSecretRaw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // Debug seguro para verificar configuração sem expor segredos
  try {
    const secretInfo = webhookSecrets.length
      ? webhookSecrets.map((s, i) => ({ idx: i, len: s.length, suffix: s.slice(-6) }))
      : null;
    const sigInfo = signature
      ? { len: signature.length, suffix: signature.slice(-6) }
      : null;
    console.log('🔐 Webhook secret carregado:', secretInfo || 'ausente');
    console.log('🔏 Stripe-Signature header:', sigInfo || 'ausente');
    console.log('🧾 Body é Buffer?', Buffer.isBuffer(req.body));
  } catch (e) {
    console.log('ℹ️ Falha ao logar informações de debug do webhook:', e.message);
  }

  if (!webhookSecrets.length) {
    console.error('❌ STRIPE_WEBHOOK_SECRET não configurado!');
    return res.status(500).json({ error: 'Webhook secret não configurado' });
  }

  let event;

  try {
    // Verificar assinatura do webhook tentando múltiplos secrets
    let lastErr = null;
    for (let i = 0; i < webhookSecrets.length; i++) {
      const secret = webhookSecrets[i];
      try {
        event = stripe.webhooks.constructEvent(req.body, signature, secret);
        console.log(`✅ Webhook verificado com secret idx=${i}: ${event.type} (ID: ${event.id})`);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr && !event) throw lastErr;
  } catch (err) {
    console.error('❌ Erro ao verificar webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Processar evento
    console.log(`🔄 Processando evento: ${event.type}`);
    await processStripeWebhook(event);
    
    // Responder ao Stripe
    console.log(`✅ Evento ${event.type} processado com sucesso`);
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    console.error('📋 Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar webhook',
    });
  }
}

