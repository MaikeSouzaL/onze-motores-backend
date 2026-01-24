import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import AppConfig from "../models/AppConfig.js";

/**
 * Verifica as permissões do usuário baseado no plano e configurações
 * @param {string} uid - UID do usuário
 * @returns {Promise<{
 *   isAdmin: boolean,
 *   isPremium: boolean,
 *   isTrial: boolean,
 *   plan: 'admin' | 'premium' | 'trial' | 'free',
 *   config: Object
 * }>}
 */
export const getUserPermissions = async (uid) => {
  const user = await User.findOne({ uid });
  const isAdmin = user && user.role === "admin";

  if (isAdmin) {
    return {
      isAdmin: true,
      isPremium: true,
      isTrial: false,
      plan: "admin",
      config: null, // Admin tem acesso total
    };
  }

  const subscription = await Subscription.findOne({ uid });
  const now = new Date();

  // Check Premium (Active or Canceled but valid)
  const isPremium =
    subscription &&
    (subscription.status === "active" ||
      (subscription.status === "canceled" &&
        subscription.endDate &&
        new Date(subscription.endDate) > now));

  // Check Trial
  const isTrial =
    subscription &&
    subscription.trial &&
    subscription.trial.isTrial &&
    subscription.trial.trialEndDate &&
    new Date(subscription.trial.trialEndDate) > now;

  // Carregar configurações globais
  const appConfig = await AppConfig.findOne({ key: "settings" });
  const tierConfig =
    isPremium || isTrial ? appConfig?.paidTier : appConfig?.freeTier;

  return {
    isAdmin: false,
    isPremium,
    isTrial,
    plan: isPremium ? "premium" : isTrial ? "trial" : "free",
    config: tierConfig,
  };
};
