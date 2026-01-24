/**
 * Controller para operações do Stripe
 */

import { getStripeInstance } from "../config/stripe.js";
import { config } from "../config/index.js";
import { STRIPE_PRODUCTS } from "../constants/stripeProducts.js";
import Subscription from "../models/Subscription.js";
import AppConfig from "../models/AppConfig.js";
import { activateSubscription } from "../services/subscription.service.js";

/**
 * Criar sessão de checkout no Stripe
 *
 * POST /api/stripe/create-checkout-session
 * Body: {
 *   planType: 'monthly' | 'annual',
 *   userId: string,
 *   useDynamicPricing?: boolean,  // Se true, usa o preço enviado em vez do Price ID
 *   price?: number                // Preço em reais (ex: 29.90)
 * }
 */
export async function createCheckoutSession(req, res, next) {
  try {
    console.log("📥 [CHECKOUT] Request recebido:", {
      body: req.body,
      headers: req.headers["content-type"],
    });

    let {
      planType,
      userId,
      userEmail,
      successUrl,
      cancelUrl,
      useDynamicPricing,
      price,
    } = req.body;
    const stripe = getStripeInstance();
    const isTestMode =
      (
        config?.stripe?.secretKey ||
        process.env.STRIPE_SECRET_KEY ||
        ""
      ).startsWith("sk_test_") ||
      (config?.nodeEnv || process.env.NODE_ENV) !== "production";

    console.log("🔧 [CHECKOUT] Stripe inicializado");
    console.log(
      `🧪 [CHECKOUT] Modo de teste? ${isTestMode ? "sim" : "não"} | NODE_ENV=${
        config?.nodeEnv || process.env.NODE_ENV
      }`
    );

    // Se useDynamicPricing ou price não foram enviados, buscar do banco de dados
    if (useDynamicPricing === undefined || price === undefined) {
      console.log(
        "🔍 [CHECKOUT] Buscando configurações de preço do banco de dados..."
      );
      try {
        const appSettings = await AppConfig.findOne({ key: "settings" });
        if (appSettings && appSettings.pricing) {
          if (useDynamicPricing === undefined) {
            useDynamicPricing = appSettings.pricing.useDynamicPricing || false;
            console.log(
              `📊 [CHECKOUT] useDynamicPricing do DB: ${useDynamicPricing}`
            );
          }
          if (price === undefined && useDynamicPricing) {
            price =
              planType === "monthly"
                ? appSettings.pricing.monthly
                : appSettings.pricing.annual;
            console.log(
              `💰 [CHECKOUT] Preço do DB: R$ ${price} para plano ${planType}`
            );
          }
        }
      } catch (error) {
        console.warn(
          "⚠️ [CHECKOUT] Erro ao buscar configurações do DB:",
          error.message
        );
      }
    }

    // Obter dados do plano
    const product = STRIPE_PRODUCTS[planType];
    if (!product) {
      console.error(`❌ [CHECKOUT] Plano inválido: ${planType}`);
      return res.status(400).json({
        success: false,
        error: 'Plano inválido. Use "monthly" ou "annual"',
      });
    }

    console.log(`✅ [CHECKOUT] Produto encontrado:`, {
      planType,
      priceId: product.priceId,
      productId: product.productId,
      name: product.name,
    });

    // URLs de retorno
    // Garante que sempre incluiremos o session_id para o app recuperar a sessão
    const ensureSessionIdParam = (url) => {
      if (!url)
        return `onzemotores://payment-success?session_id={CHECKOUT_SESSION_ID}`;
      const hasParam = url.includes("session_id=");
      if (hasParam) return url;
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}session_id={CHECKOUT_SESSION_ID}`;
    };
    const defaultSuccessUrl = ensureSessionIdParam(
      successUrl || `onzemotores://payment-success`
    );
    const defaultCancelUrl = cancelUrl || `onzemotores://payment-cancel`;

    // Configurar line_items baseado no modo (dinâmico ou fixo)
    let lineItems;

    if (useDynamicPricing && price) {
      // MODO DINÂMICO: Usa o preço enviado pelo app (definido pelo admin)
      console.log(
        `💰 [CHECKOUT] Tentando usar preço dinâmico: R$ ${price} para plano ${planType}`
      );

      // Extrair Product ID do Price ID (prod_xxx) como fallback
      const productIdFallback = product.priceId.replace(/^price_/, "prod_");

      try {
        // Tentar criar com price_data (requer Product ID válido)
        lineItems = [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: product.name,
                description:
                  planType === "monthly"
                    ? "Assinatura Mensal"
                    : "Assinatura Anual",
              },
              unit_amount: Math.round(price * 100), // Converter para centavos
              recurring: {
                interval: planType === "monthly" ? "month" : "year",
              },
            },
            quantity: 1,
          },
        ];
        console.log(
          `✅ [CHECKOUT] Usando price_data dinâmico (criará produto automaticamente)`
        );
      } catch (error) {
        console.warn(
          `⚠️ [CHECKOUT] Falha ao usar preço dinâmico, usando Price ID fixo como fallback`
        );
        // Fallback para Price ID fixo
        lineItems = [
          {
            price: product.priceId,
            quantity: 1,
          },
        ];
      }
    } else {
      // MODO FIXO: Usa o Price ID cadastrado no Stripe
      console.log(
        `📋 [CHECKOUT] Usando Price ID fixo: ${product.priceId} para plano ${planType}`
      );

      lineItems = [
        {
          price: product.priceId,
          quantity: 1,
        },
      ];
    }

    console.log(
      "🛒 [CHECKOUT] Line items preparados:",
      JSON.stringify(lineItems, null, 2)
    );

    // Em TEST/DEV (Accounts V2), o Stripe exige customer existente para Checkout
    // Para produção, mantemos edição de e-mail; para teste, criamos/associamos customer

    // Criar sessão de checkout
    console.log("🚀 [CHECKOUT] Preparando sessão no Stripe...");
    const sessionConfig = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "subscription",
      success_url: defaultSuccessUrl,
      cancel_url: defaultCancelUrl,
      client_reference_id: userId, // Para identificar o usuário no webhook
      metadata: {
        userId,
        planType,
        useDynamicPricing: useDynamicPricing ? "true" : "false",
        price: price ? String(price) : "",
      },
      subscription_data: {
        metadata: {
          userId,
          planType,
        },
      },
      // customer_email só será usado em produção; em teste vamos definir customer
    };

    // Se estivermos em ambiente de desenvolvimento (TEST), garantir customer
    if (isTestMode) {
      console.log(
        "🧪 [CHECKOUT] Ambiente de TESTE/DEV detectado: criando/associando customer"
      );
      const emailForTest = userEmail || `${userId}@test.onzemotores.local`;
      // Tentar reutilizar customer existente pelo e-mail em vez de criar sempre
      let customerId;
      try {
        const existing = await stripe.customers.list({
          email: emailForTest,
          limit: 1,
        });
        customerId = existing?.data?.[0]?.id;
        if (customerId) {
          console.log(
            `♻️ [CHECKOUT] Reutilizando customer existente: ${customerId}`
          );
        }
      } catch (listErr) {
        console.warn(
          "⚠️ [CHECKOUT] Falha ao listar customers por e-mail:",
          listErr.message
        );
      }

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: emailForTest,
          metadata: { userId },
          name: "Teste Onze Motores",
          description: `Customer de teste para usuário ${userId}`,
        });
        customerId = customer.id;
        console.log(`✅ [CHECKOUT] Customer de teste criado: ${customerId}`);
      }

      sessionConfig.customer = customerId;
      console.log("🧪 [CHECKOUT] sessionConfig (TEST):", {
        hasCustomer: !!sessionConfig.customer,
        customer: sessionConfig.customer,
        hasCustomerEmail: !!sessionConfig.customer_email,
      });
      // Em teste, não usar customer_email para permitir a criação da sessão
    } else {
      // Produção: permitir edição do e-mail; não associar customer aqui
      if (userEmail) {
        sessionConfig.customer_email = userEmail;
      }
      console.log("🏭 [CHECKOUT] sessionConfig (PROD):", {
        hasCustomer: !!sessionConfig.customer,
        hasCustomerEmail: !!sessionConfig.customer_email,
        customerEmail: sessionConfig.customer_email || null,
      });
    }
    console.log("🚀 [CHECKOUT] Criando sessão no Stripe...");
    const session = await stripe.checkout.sessions.create(sessionConfig);

    console.log("✅ [CHECKOUT] Sessão criada com sucesso:", {
      sessionId: session.id,
      url: session.url,
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("❌ [CHECKOUT] Erro ao criar checkout session:", {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    });
    next(error);
  }
}

/**
 * Cancelar assinatura no Stripe
 *
 * POST /api/stripe/cancel-subscription
 * Body: { userId: string }
 */
export async function cancelSubscription(req, res, next) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId é obrigatório",
      });
    }

    const stripe = getStripeInstance();

    // Buscar assinatura do usuário no MongoDB
    const subscription = await Subscription.findOne({ uid: userId });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: "Assinatura não encontrada",
      });
    }

    const stripeSubscriptionId = subscription.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: "Usuário não possui assinatura ativa no Stripe",
      });
    }

    // Cancelar assinatura no Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(
      stripeSubscriptionId
    );

    // Atualizar status no MongoDB
    subscription.status = "canceled";
    await subscription.save();

    console.log(`✅ Assinatura cancelada no Stripe para usuário: ${userId}`);
    console.log(`📋 Subscription ID: ${stripeSubscriptionId}`);

    res.json({
      success: true,
      message: "Assinatura cancelada com sucesso",
      subscriptionId: canceledSubscription.id,
    });
  } catch (error) {
    console.error("Erro ao cancelar assinatura:", error);

    // Se o erro for do Stripe, retornar mensagem mais específica
    if (error.type === "StripeInvalidRequestError") {
      return res.status(400).json({
        success: false,
        error: error.message || "Erro ao cancelar assinatura no Stripe",
      });
    }

    next(error);
  }
}

/**
 * Confirmar sessão de checkout (fallback quando webhook demora)
 *
 * POST /api/stripe/confirm-session
 * Body: { sessionId: string, userId?: string }
 */
export async function confirmSession(req, res, next) {
  try {
    const { sessionId, userId } = req.body;
    if (!sessionId) {
      return res
        .status(400)
        .json({ success: false, error: "sessionId é obrigatório" });
    }

    const stripe = getStripeInstance();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: "Sessão não encontrada no Stripe" });
    }

    const paid =
      session.payment_status === "paid" || session.status === "complete";
    if (!paid) {
      return res
        .status(409)
        .json({ success: false, error: "Sessão ainda não concluída/paga" });
    }

    const derivedUserId =
      session.metadata?.userId || session.client_reference_id || userId;
    const planType = session.metadata?.planType || "monthly";
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    if (!derivedUserId) {
      return res
        .status(422)
        .json({
          success: false,
          error: "Não foi possível determinar o usuário",
        });
    }

    await activateSubscription({
      userId: derivedUserId,
      subscriptionId,
      customerId,
      planType,
    });

    return res.json({
      success: true,
      message: "Assinatura ativada via confirmação de sessão",
      data: { userId: derivedUserId, subscriptionId, customerId, planType },
    });
  } catch (error) {
    console.error("❌ [CONFIRM SESSION] Falha:", error);
    next(error);
  }
}
