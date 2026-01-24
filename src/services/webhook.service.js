/**
 * Serviço para processar eventos do Stripe Webhook
 */

import {
  activateSubscription,
  cancelSubscription,
} from "./subscription.service.js";
import { sendPushNotificationToUser } from "./pushNotification.service.js";
import Subscription from "../models/Subscription.js";

/**
 * Processar evento do webhook do Stripe
 */
export async function processStripeWebhook(event) {
  console.log(`📥 Processando evento: ${event.type}`);

  // Normalizar tipos de evento (Stripe Accounts v2 podem prefixar os nomes)
  const type = event.type || "";
  const normalizedType = normalizeEventType(type);

  if (normalizedType !== type) {
    console.log(`🔎 Tipo normalizado: ${normalizedType} (original: ${type})`);
  }

  switch (normalizedType) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;

    case "customer.subscription.created":
      await handleSubscriptionUpdated(event.data.object);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;

    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;

    default:
      console.log(`⚠️ Evento não tratado: ${event.type}`);
  }
}

// Mapear e normalizar tipos v2 para nomes clássicos
function normalizeEventType(type) {
  if (!type) return type;

  // Se já for um tipo clássico, retorna como está
  const classic = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
  ];
  if (classic.includes(type)) return type;

  // Heurística: muitos tipos v2 terminam com o nome clássico
  for (const t of classic) {
    if (type.endsWith(t)) return t;
  }

  // Heurística extra por substring (caso não termine exatamente)
  if (type.includes("checkout") && type.includes("session") && type.includes("completed")) {
    return "checkout.session.completed";
  }
  if (type.includes("customer") && type.includes("subscription") && type.includes("updated")) {
    return "customer.subscription.updated";
  }
  if (type.includes("customer") && type.includes("subscription") && type.includes("deleted")) {
    return "customer.subscription.deleted";
  }
  if (type.includes("invoice") && type.includes("payment") && type.includes("succeeded")) {
    return "invoice.payment_succeeded";
  }
  if (type.includes("invoice") && type.includes("payment") && type.includes("failed")) {
    return "invoice.payment_failed";
  }

  return type; // Sem mudanças
}

/**
 * Checkout concluído - Ativar assinatura
 */
async function handleCheckoutCompleted(session) {
  try {
    console.log("📥 ==========================================");
    console.log("📥 CHECKOUT CONCLUÍDO - PROCESSANDO WEBHOOK");
    console.log("📥 ==========================================");

    // Tentar obter userId de múltiplas fontes
    const userId =
      session.metadata?.userId ||
      session.client_reference_id ||
      session.subscription_data?.metadata?.userId;

    // Tentar obter planType
    const planType =
      session.metadata?.planType ||
      session.subscription_data?.metadata?.planType;

    console.log(`📥 Dados recebidos do Stripe:`, {
      sessionId: session.id,
      userId,
      planType,
      subscriptionId: session.subscription,
      customerId: session.customer,
      paymentStatus: session.payment_status,
    });

    if (!userId) {
      console.error(
        "❌ ERRO CRÍTICO: userId não encontrado no checkout session!"
      );
      
      // Tentativa de recuperação via Subscription (se houver)
      if (session.subscription) {
        const { getStripeInstance } = await import("../config/stripe.js");
        const stripe = getStripeInstance();
        try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            const subUserId = subscription.metadata?.userId || subscription.metadata?.user_id;
            
            if (subUserId) {
                console.log("✅ userId recuperado da subscription:", subUserId);
                await activateSubscription({
                    userId: subUserId,
                    subscriptionId: session.subscription,
                    customerId: session.customer,
                    planType: planType || "monthly",
                });
                return;
            }
        } catch (e) {
            console.error("❌ Falha ao recuperar subscription:", e);
        }
      }

      // Tentativa via customerId no MongoDB
      if (session.customer) {
         const existingSub = await Subscription.findOne({ stripeCustomerId: session.customer });
         if (existingSub) {
             console.log("✅ userId recuperado via customerId:", existingSub.uid);
             await activateSubscription({
                userId: existingSub.uid,
                subscriptionId: session.subscription,
                customerId: session.customer,
                planType: planType || "monthly",
            });
            return;
         }
      }

      return;
    }

    // Verificar se usuário existe no MongoDB (opcional, apenas log)
    const existingUser = await Subscription.findOne({ uid: userId });
    if (existingUser) {
        console.log(`✅ Usuário encontrado no MongoDB: ${userId}, Status: ${existingUser.status}`);
    } else {
        console.log(`🆕 Usuário não encontrado no MongoDB, será criado: ${userId}`);
    }

    // Ativar assinatura
    await activateSubscription({
      userId,
      subscriptionId: session.subscription,
      customerId: session.customer,
      planType: planType || "monthly",
    });

    console.log(
      `✅✅✅ Assinatura ativada com SUCESSO para usuário: ${userId}`
    );

    // Enviar notificação
    await sendPushNotificationToUser(userId, {
      title: "Assinatura ativada 🎉",
      body: "Sua assinatura Onze Motores foi ativada com sucesso.",
      data: { type: "subscription_activated", userId, planType: planType || "monthly" },
    });
    console.log("📥 ==========================================");
  } catch (error) {
    console.error("❌ Erro ao processar checkout concluído:", error);
    throw error;
  }
}

/**
 * Assinatura atualizada
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    console.log("🔄 ==========================================");
    console.log("🔄 SUBSCRIPTION UPDATED - PROCESSANDO");
    console.log("🔄 ==========================================");

    const subscriptionId = subscription.id;
    const customerId = subscription.customer;
    let userId = subscription.metadata?.userId || subscription.metadata?.user_id;

    // Buscar usuário no MongoDB
    let userDoc = null;

    if (userId) {
        userDoc = await Subscription.findOne({ uid: userId });
    }

    if (!userDoc && subscriptionId) {
        userDoc = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
    }

    if (!userDoc && customerId) {
        userDoc = await Subscription.findOne({ stripeCustomerId: customerId });
    }

    if (!userDoc) {
        console.error("❌ Usuário não encontrado no MongoDB para atualização de assinatura");
        return;
    }

    userId = userDoc.uid; // Garantir que temos o userId correto
    console.log(`✅ Usuário identificado: ${userId}`);

    // Validação de segurança básica
    if (userDoc.stripeSubscriptionId && userDoc.stripeSubscriptionId !== subscriptionId) {
        console.warn(`⚠️ SubscriptionId diferente do salvo: ${userDoc.stripeSubscriptionId} vs ${subscriptionId}`);
    }

    const status = subscription.status;
    const planType = subscription.metadata?.planType;

    // Mapear status
    let newStatus = "free";
    if (status === "active" || status === "trialing") {
      newStatus = "active";
    } else if (status === "canceled" || status === "unpaid") {
      newStatus = "canceled";
    } else if (status === "past_due") {
      newStatus = "expired";
    }

    const updateData = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    if (planType) {
      updateData.plan = planType;
    }

    if (newStatus === "active" && subscription.current_period_end) {
      updateData.endDate = new Date(subscription.current_period_end * 1000).toISOString();
      if (subscription.current_period_start) {
        updateData.startDate = new Date(subscription.current_period_start * 1000).toISOString();
      }
    }

    await Subscription.findOneAndUpdate({ uid: userId }, updateData);

    console.log(
      `✅ Status atualizado: ${status} -> ${newStatus}`
    );

    // Notificações
    if (newStatus === "active") {
      await sendPushNotificationToUser(userId, {
        title: "Assinatura renovada ✅",
        body: "Seu pagamento foi confirmado e sua assinatura continua ativa.",
        data: { type: "subscription_renewed", userId },
      });
    } else if (newStatus === "canceled" || newStatus === "expired") {
      await sendPushNotificationToUser(userId, {
        title: "Assinatura atualizada",
        body: "Sua assinatura não está mais ativa. Abra o app para ver detalhes.",
        data: { type: "subscription_status_changed", userId, status: newStatus },
      });
    }
  } catch (error) {
    console.error("❌ Erro ao processar subscription updated:", error);
    throw error;
  }
}

/**
 * Assinatura cancelada
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const userId = subscription.metadata?.userId;
    // Se não tiver userId no metadata, tentar buscar no banco
    let targetUserId = userId;

    if (!targetUserId) {
        const sub = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
        if (sub) targetUserId = sub.uid;
    }

    if (!targetUserId) {
      console.error("❌ userId não encontrado para cancelamento");
      return;
    }

    console.log(`❌ Assinatura cancelada para usuário: ${targetUserId}`);

    await cancelSubscription({ userId: targetUserId });

    await sendPushNotificationToUser(targetUserId, {
      title: "Assinatura cancelada",
      body: "Sua assinatura Onze Motores foi cancelada.",
      data: { type: "subscription_canceled", userId: targetUserId },
    });
  } catch (error) {
    console.error("❌ Erro ao processar subscription deleted:", error);
    throw error;
  }
}

/**
 * Pagamento bem-sucedido
 */
async function handlePaymentSucceeded(invoice) {
  try {
    console.log("✅ ==========================================");
    console.log("✅ INVOICE PAYMENT SUCCEEDED - PROCESSANDO");
    console.log("✅ ==========================================");

    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    if (!customerId || !subscriptionId) return;

    // Buscar usuário
    let userDoc = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
    if (!userDoc) {
        userDoc = await Subscription.findOne({ stripeCustomerId: customerId });
    }

    if (!userDoc) {
        console.error(`❌ Usuário não encontrado para pagamento: ${customerId}`);
        return;
    }

    const userId = userDoc.uid;
    console.log(`✅ Pagamento para usuário: ${userId}`);

    // Buscar data de expiração atualizada
    let newEndDate = null;
    try {
      const { getStripeInstance } = await import("../config/stripe.js");
      const stripe = getStripeInstance();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (subscription.current_period_end) {
        newEndDate = new Date(subscription.current_period_end * 1000).toISOString();
      }
    } catch (e) {
        console.error("Erro ao buscar detalhes da subscription no Stripe", e);
    }

    const updateData = {
      status: "active",
      updatedAt: new Date().toISOString(),
    };

    if (newEndDate) {
      updateData.endDate = newEndDate;
    }

    await Subscription.findOneAndUpdate({ uid: userId }, updateData);

    console.log(`✅ Data de expiração atualizada para: ${newEndDate}`);

    await sendPushNotificationToUser(userId, {
      title: "Pagamento confirmado ✅",
      body: "O pagamento da sua assinatura Onze Motores foi confirmado.",
      data: { type: "payment_succeeded", userId },
    });
  } catch (error) {
    console.error("❌ Erro ao processar payment succeeded:", error);
    throw error;
  }
}

/**
 * Pagamento falhou
 */
async function handlePaymentFailed(invoice) {
  try {
    console.log("⚠️ ==========================================");
    console.log("⚠️ INVOICE PAYMENT FAILED - PROCESSANDO");
    console.log("⚠️ ==========================================");

    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;

    let userDoc = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
    if (!userDoc) {
        userDoc = await Subscription.findOne({ stripeCustomerId: customerId });
    }

    if (!userDoc) {
        console.error(`❌ Usuário não encontrado para falha de pagamento: ${customerId}`);
        return;
    }

    const userId = userDoc.uid;
    console.log(`⚠️ Pagamento falhou para usuário: ${userId}`);

    await Subscription.findOneAndUpdate({ uid: userId }, {
      status: "expired",
      updatedAt: new Date().toISOString(),
    });

    await sendPushNotificationToUser(userId, {
      title: "Pagamento não autorizado ⚠️",
      body: "Tivemos um problema ao cobrar sua assinatura. Abra o app para regularizar.",
      data: { type: "payment_failed", userId },
    });
  } catch (error) {
    console.error("❌ Erro ao processar payment failed:", error);
    throw error;
  }
}
