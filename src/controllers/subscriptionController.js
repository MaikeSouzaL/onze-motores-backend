import Subscription from '../models/Subscription.js';
import User from '../models/User.js';

/**
 * @desc    Obter assinatura do usuário
 * @route   GET /api/subscriptions/:uid
 */
export const getSubscription = async (req, res) => {
  try {
    const { uid } = req.params;

    let subscription = await Subscription.findOne({ uid });

    if (!subscription) {
      // Se não existir, criar uma padrão (FREE)
      subscription = await Subscription.create({
        uid,
        status: 'free',
        trial: {
          isTrial: false,
          trialUsed: false,
        }
      });
    }

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Atualizar status do trial
 * @route   POST /api/subscriptions/trial
 */
export const startTrial = async (req, res) => {
  try {
    const { uid, days = 7 } = req.body;

    const subscription = await Subscription.findOne({ uid });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Assinatura não encontrada' });
    }

    if (subscription.trial.trialUsed) {
      return res.status(400).json({ success: false, message: 'Trial já foi utilizado' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    subscription.status = 'active'; // Trial conta como ativo
    subscription.trial = {
      isTrial: true,
      trialStartDate: startDate,
      trialEndDate: endDate,
      trialUsed: true,
    };
    subscription.startDate = startDate;
    subscription.endDate = endDate;

    await subscription.save();

    res.status(200).json({
      success: true,
      data: subscription,
      message: 'Período de teste iniciado'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Marcar que o usuário visualizou o modal de boas-vindas
 * @route   POST /api/subscriptions/welcome-shown
 */
export const markWelcomeShown = async (req, res) => {
  try {
    const { uid, type } = req.body; // type: 'trial' | 'premium'

    const subscription = await Subscription.findOne({ uid });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Assinatura não encontrada' });
    }

    if (type === 'trial') {
      subscription.trial.trialWelcomeShown = true;
      subscription.markModified('trial'); // Importante para objetos aninhados se mixed type, mas aqui é schema
    } else if (type === 'premium') {
      subscription.premiumWelcomeShown = true;
    }

    await subscription.save();

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const updateSubscriptionStatus = async (req, res) => {
  try {
    const { uid, status, plan, endDate } = req.body;

    const subscription = await Subscription.findOneAndUpdate(
      { uid },
      {
        status,
        plan,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
