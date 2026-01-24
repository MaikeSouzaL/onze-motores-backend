/**
 * Controller de Notificações Push
 *
 * Rotas:
 * - POST /api/notifications/register-token
 * - (opcional) POST /api/notifications/send-test
 */

import {
  saveUserPushToken,
  sendPushNotificationToUser,
  listUserTokens,
} from "../services/pushNotification.service.js";

/**
 * Registrar/atualizar token de push de um usuário
 *
 * Body: {
 *   userId: string;
 *   expoPushToken: string;
 *   platform?: string;
 *   deviceId?: string;
 * }
 */
export async function registerPushToken(req, res, next) {
  try {
    console.log("📥 [BACKEND] Requisição de registro de token recebida");
    const { userId, expoPushToken, platform, deviceId } = req.body || {};
    
    console.log("📥 [BACKEND] Dados recebidos:", {
      userId,
      expoPushToken: expoPushToken ? `${expoPushToken.substring(0, 20)}...` : null,
      platform,
      deviceId,
    });

    if (!userId || !expoPushToken) {
      console.log("❌ [BACKEND] Dados incompletos");
      return res.status(400).json({
        success: false,
        error: "userId e expoPushToken são obrigatórios",
      });
    }

    console.log("🔍 [BACKEND] Salvando token no Firestore...");
    const result = await saveUserPushToken({
      userId,
      expoPushToken,
      platform,
      deviceId,
    });

    console.log("✅ [BACKEND] Token salvo com sucesso:", {
      id: result.id,
      updated: result.updated,
    });

    return res.json({
      success: true,
      updated: result.updated,
      id: result.id,
    });
  } catch (error) {
    console.error("❌ [BACKEND] Erro ao registrar push token:", error);
    next(error);
  }
}

/**
 * Enviar notificação de teste para um usuário
 *
 * Body: {
 *   userId: string;
 *   title?: string;
 *   body?: string;
 *   data?: any;
 * }
 */
export async function sendTestNotification(req, res, next) {
  try {
    const { userId, title, body, data } = req.body || {};

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId é obrigatório",
      });
    }

    await sendPushNotificationToUser(userId, {
      title: title || "Notificação de teste",
      body: body || "Suas notificações push estão funcionando ✅",
      data: data || { type: "test" },
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error("❌ Erro ao enviar notificação de teste:", error);
    next(error);
  }
}

/**
 * Listar tokens de um usuário (uso administrativo)
 */
export async function listTokens(req, res, next) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId é obrigatório",
      });
    }

    const tokens = await listUserTokens(userId);
    return res.json({
      success: true,
      count: tokens.length,
      tokens,
    });
  } catch (error) {
    console.error("❌ Erro ao listar tokens:", error);
    next(error);
  }
}


