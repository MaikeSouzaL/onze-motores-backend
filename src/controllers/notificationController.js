import Notification from '../models/Notification.js';
import User from '../models/User.js';
import UserPushToken from '../models/UserPushToken.js';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Criar notificação no banco e enviar push
 */
export const createNotification = async ({
  uid,
  title,
  body,
  type = 'general',
  data = {},
  priority = 'normal',
  icon,
  imageUrl,
  actionUrl,
  expiresInDays,
  sendPush = true,
}) => {
  try {
    // Calcular expiração se fornecido
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    // Criar notificação no banco
    const notification = await Notification.create({
      uid,
      title,
      body,
      type,
      data,
      priority,
      icon,
      imageUrl,
      actionUrl,
      expiresAt,
    });

    console.log(`📬 Notificação criada para ${uid}: ${title}`);

    // Enviar push notification se habilitado
    if (sendPush) {
      await sendPushNotification(uid, title, body, data, priority);
    }

    return notification;
  } catch (error) {
    console.error('❌ Erro ao criar notificação:', error);
    throw error;
  }
};

/**
 * Enviar push notification via Expo
 */
const sendPushNotification = async (uid, title, body, data = {}, priority = 'normal') => {
  try {
    // Buscar tokens do usuário
    const tokens = await UserPushToken.find({ uid, active: true });

    if (tokens.length === 0) {
      console.log(`⚠️ Usuário ${uid} não tem tokens de push ativos`);
      return;
    }

    const messages = [];

    for (const tokenDoc of tokens) {
      const { pushToken } = tokenDoc;

      // Validar token
      if (!Expo.isExpoPushToken(pushToken)) {
        console.warn(`⚠️ Token inválido: ${pushToken}`);
        continue;
      }

      messages.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: priority === 'urgent' ? 'high' : 'default',
        badge: 1,
      });
    }

    if (messages.length === 0) {
      console.log(`⚠️ Nenhuma mensagem válida para enviar`);
      return;
    }

    // Enviar em chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('❌ Erro ao enviar chunk de notificações:', error);
      }
    }

    console.log(`✅ ${tickets.length} notificações push enviadas para ${uid}`);
    return tickets;
  } catch (error) {
    console.error('❌ Erro ao enviar push notification:', error);
    throw error;
  }
};

/**
 * Notificar admins quando um novo motor é cadastrado
 */
export const notifyAdminsNewMotor = async (motor, userId) => {
  try {
    // Buscar usuário que cadastrou
    const user = await User.findOne({ uid: userId });
    const userName = user?.nome || user?.email || 'Usuário';

    // Buscar todos os admins
    const admins = await User.find({ permissoes: 'admin' });

    console.log(`🔔 Notificando ${admins.length} admins sobre novo motor`);

    for (const admin of admins) {
      await createNotification({
        uid: admin.uid,
        title: '🆕 Novo Motor Cadastrado',
        body: `${userName} cadastrou "${motor.modelo || 'Sem modelo'}" - ${motor.marca || 'Sem marca'}`,
        type: 'motor_created',
        data: {
          motorId: motor._id.toString(),
          motorModelo: motor.modelo,
          motorMarca: motor.marca,
          userId,
          userName,
        },
        priority: 'normal',
        icon: 'add-circle',
        actionUrl: `/motors/${motor._id}`,
        expiresInDays: 7,
      });
    }

    return admins.length;
  } catch (error) {
    console.error('❌ Erro ao notificar admins:', error);
    throw error;
  }
};

/**
 * Notificar usuários quando um motor favorito é modificado
 */
export const notifyFavoriteUpdate = async (motor, editorId) => {
  try {
    // Buscar editor
    const editor = await User.findOne({ uid: editorId });
    const editorName = editor?.nome || editor?.email || 'Alguém';

    // Buscar usuários que favoritaram este motor (excluindo o editor)
    const favoriteUsers = await User.find({
      favoritos: motor._id.toString(),
      uid: { $ne: editorId },
    });

    console.log(`💖 Notificando ${favoriteUsers.length} usuários sobre atualização de favorito`);

    for (const user of favoriteUsers) {
      await createNotification({
        uid: user.uid,
        title: '💖 Favorito Atualizado',
        body: `${editorName} atualizou "${motor.modelo || 'motor favorito'}"`,
        type: 'favorite_updated',
        data: {
          motorId: motor._id.toString(),
          motorModelo: motor.modelo,
          motorMarca: motor.marca,
          userId: editorId,
          userName: editorName,
        },
        priority: 'normal',
        icon: 'heart',
        actionUrl: `/motors/${motor._id}`,
        expiresInDays: 7,
      });
    }

    return favoriteUsers.length;
  } catch (error) {
    console.error('❌ Erro ao notificar sobre favorito:', error);
    throw error;
  }
};

/**
 * Criar alerta de manutenção preventiva
 */
export const createMaintenanceAlert = async (uid, motorId, message, daysUntilMaintenance) => {
  try {
    const priority = daysUntilMaintenance <= 7 ? 'high' : 'normal';

    await createNotification({
      uid,
      title: '🔧 Alerta de Manutenção',
      body: message,
      type: 'maintenance_alert',
      data: { motorId },
      priority,
      icon: 'build',
      actionUrl: `/motors/${motorId}`,
      expiresInDays: daysUntilMaintenance,
    });

    console.log(`🔧 Alerta de manutenção criado para ${uid}`);
  } catch (error) {
    console.error('❌ Erro ao criar alerta de manutenção:', error);
    throw error;
  }
};

/**
 * Listar notificações do usuário
 */
export const getUserNotifications = async (req, res) => {
  try {
    const { uid } = req.params;
    const { unreadOnly = false, type, limit = 50, skip = 0 } = req.query;

    const query = { uid };

    if (unreadOnly === 'true') {
      query.read = false;
    }

    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const unreadCount = await Notification.countDocuments({ uid, read: false });

    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('❌ Erro ao listar notificações:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Marcar notificação como lida
 */
export const markAsRead = async (req, res) => {
  try {
    const { uid, notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, uid },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificação não encontrada' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('❌ Erro ao marcar notificação como lida:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Marcar todas as notificações como lidas
 */
export const markAllAsRead = async (req, res) => {
  try {
    const { uid } = req.params;

    await Notification.updateMany({ uid, read: false }, { read: true });

    res.json({ success: true, message: 'Todas as notificações marcadas como lidas' });
  } catch (error) {
    console.error('❌ Erro ao marcar todas como lidas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Deletar notificação
 */
export const deleteNotification = async (req, res) => {
  try {
    const { uid, notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({ _id: notificationId, uid });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificação não encontrada' });
    }

    res.json({ success: true, message: 'Notificação deletada' });
  } catch (error) {
    console.error('❌ Erro ao deletar notificação:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Limpar notificações antigas
 */
export const cleanupOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await Notification.deleteMany({
      read: true,
      createdAt: { $lt: thirtyDaysAgo },
    });

    console.log(`🧹 ${result.deletedCount} notificações antigas removidas`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Erro ao limpar notificações antigas:', error);
    throw error;
  }
};
