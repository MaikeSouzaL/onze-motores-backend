import User from '../models/User.js';
import Subscription from '../models/Subscription.js';

/**
 * @desc    Listar todos os usuários (Admin)
 * @route   GET /api/admin/users
 */
export const getUsers = async (req, res) => {
  try {
    // Buscar usuários e suas assinaturas
    // Em produção, isso deve ser paginado
    const users = await User.find().sort({ createdAt: -1 });
    
    // Para cada usuário, buscar assinatura
    const usersWithSubs = await Promise.all(users.map(async (user) => {
      const sub = await Subscription.findOne({ uid: user.uid });
      return {
        uid: user.uid,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        isAdmin: user.role === 'admin',
        createdAt: user.createdAt,
        status: sub?.status || 'free',
        plan: sub?.plan || null,
        endDate: sub?.endDate,
        stripeSubscriptionId: sub?.stripeSubscriptionId,
      };
    }));

    res.status(200).json({
      success: true,
      count: usersWithSubs.length,
      data: usersWithSubs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
