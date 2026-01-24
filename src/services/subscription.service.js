import Subscription from "../models/Subscription.js";

/**
 * Ativar assinatura no MongoDB
 *
 * @param {string} userId - ID do usuário
 * @param {string} subscriptionId - ID da subscription no Stripe
 * @param {string} customerId - ID do customer no Stripe
 * @param {string} planType - Tipo de plano ('monthly' ou 'annual')
 */
export async function activateSubscription({
  userId,
  subscriptionId,
  customerId,
  planType,
}) {
  try {
    console.log(`📝 activateSubscription chamado com:`, {
      userId,
      subscriptionId,
      customerId,
      planType,
    });

    // Validar userId
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      throw new Error("userId é obrigatório e deve ser uma string válida");
    }

    const now = new Date();
    const endDate = new Date();

    // Calcular data de término baseado no plano
    if (planType === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
      console.log(
        `📅 Plano mensal: Assinatura válida até ${endDate.toISOString()}`
      );
    } else if (planType === "annual") {
      endDate.setFullYear(endDate.getFullYear() + 1);
      console.log(
        `📅 Plano anual: Assinatura válida até ${endDate.toISOString()}`
      );
    } else {
      console.warn(
        `⚠️ PlanType inválido: ${planType}, usando monthly como padrão`
      );
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Buscar subscription existente para preservar campos como trialEndDate
    const existingData = await Subscription.findOne({ uid: userId });

    console.log(`📋 Dados existentes do usuário:`, {
      exists: !!existingData,
      currentStatus: existingData?.status,
      currentPlan: existingData?.plan,
      hasTrialEndDate: !!existingData?.trialEndDate,
    });

    // Construir objeto de atualização garantindo que todos os campos necessários estejam presentes
    const updateData = {
      uid: userId,
      status: "active",
      plan: planType,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      updatedAt: now.toISOString(),
      premiumWelcomeShown: false, // Resetar para mostrar tela de boas-vindas
    };

    // Adicionar campos do Stripe se existirem
    if (customerId) {
      updateData.stripeCustomerId = customerId;
    }
    if (subscriptionId) {
      updateData.stripeSubscriptionId = subscriptionId;
    }

    // Preservar createdAt se não existir
    if (!existingData) {
      updateData.createdAt = now.toISOString();
    }

    console.log(`📝 Salvando no MongoDB para usuário: ${userId}`);

    // Usar findOneAndUpdate com upsert para criar ou atualizar
    const savedSubscription = await Subscription.findOneAndUpdate(
      { uid: userId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    console.log(`✅✅✅ Verificação pós-salvamento:`, {
      status: savedSubscription?.status,
      plan: savedSubscription?.plan,
      uid: savedSubscription?.uid,
      stripeCustomerId: savedSubscription?.stripeCustomerId
        ? "✅ preenchido"
        : "❌ vazio",
      stripeSubscriptionId: savedSubscription?.stripeSubscriptionId
        ? "✅ preenchido"
        : "❌ vazio",
      startDate: savedSubscription?.startDate,
      endDate: savedSubscription?.endDate,
    });

    return savedSubscription;
  } catch (error) {
    console.error("❌ Erro ao ativar assinatura:", error);
    throw error;
  }
}

/**
 * Cancelar assinatura no MongoDB
 */
export async function cancelSubscription({ userId }) {
  try {
    await Subscription.findOneAndUpdate(
      { uid: userId },
      {
        status: "canceled",
        updatedAt: new Date().toISOString(),
      }
    );

    console.log(`✅ Assinatura cancelada no MongoDB para: ${userId}`);
  } catch (error) {
    console.error("❌ Erro ao cancelar assinatura:", error);
    throw error;
  }
}
