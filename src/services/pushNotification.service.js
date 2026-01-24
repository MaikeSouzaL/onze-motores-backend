/**
 * Serviço de Notificações Push (Expo)
 *
 * Responsável por:
 * - Salvar tokens de notificação (Expo Push Token) por usuário no MongoDB
 * - Enviar notificações push para um usuário (todas as sessões/dispositivos)
 */

import { Expo } from "expo-server-sdk";
import UserPushToken from "../models/UserPushToken.js";

// Instância única do cliente Expo
const expo = new Expo();

/**
 * Salvar ou atualizar o token de push de um usuário
 *
 * Estrutura no MongoDB (UserPushToken):
 * - userId: string (UID do usuário)
 * - expoPushToken: string
 * - platform: "ios" | "android" | "web" | string
 * - deviceId?: string
 * - createdAt: Date
 * - updatedAt: Date
 */
export async function saveUserPushToken({
  userId,
  expoPushToken,
  platform,
  deviceId,
}) {
  if (!userId || typeof userId !== "string") {
    throw new Error("userId é obrigatório");
  }
  if (!expoPushToken || typeof expoPushToken !== "string") {
    throw new Error("expoPushToken é obrigatório");
  }

  // Usar findOneAndUpdate com upsert para criar ou atualizar
  // A chave única é o expoPushToken
  const tokenDoc = await UserPushToken.findOneAndUpdate(
    { expoPushToken },
    {
      userId,
      expoPushToken,
      platform: platform || "unknown",
      deviceId: deviceId || null,
    },
    { new: true, upsert: true }
  );

  console.log(
    `✅ Push token salvo/atualizado (user: ${userId}, token: ${expoPushToken.slice(
      0,
      24
    )}...)`
  );

  return { id: tokenDoc._id, updated: true };
}

/**
 * Buscar todos os tokens de um usuário
 */
async function getUserTokens(userId) {
  if (!userId) return [];

  const tokensDocs = await UserPushToken.find({ userId });

  if (!tokensDocs.length) return [];

  const tokens = [];
  for (const doc of tokensDocs) {
    if (doc.expoPushToken && Expo.isExpoPushToken(doc.expoPushToken)) {
      tokens.push(doc.expoPushToken);
    }
  }

  return [...new Set(tokens)]; // remover duplicados
}

/**
 * Buscar todos os tokens de todos os usuários (para broadcast)
 */
async function getAllPushTokens() {
  const tokensDocs = await UserPushToken.find({});

  if (!tokensDocs.length) return [];

  const tokens = [];
  for (const doc of tokensDocs) {
    if (doc.expoPushToken && Expo.isExpoPushToken(doc.expoPushToken)) {
      tokens.push(doc.expoPushToken);
    }
  }

  return [...new Set(tokens)]; // remover duplicados
}

/**
 * Enviar notificação push para TODOS os usuários (Broadcast)
 *
 * @param {{ title: string; body: string; data?: any }} message
 */
export async function sendBroadcastNotification(message) {
  const tokens = await getAllPushTokens();

  if (!tokens.length) {
    console.log("ℹ️ Nenhum push token encontrado para broadcast.");
    return;
  }

  console.log(`📢 Enviando broadcast para ${tokens.length} dispositivos...`);

  const messages = [];

  for (const token of tokens) {
    messages.push({
      to: token,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data || {},
    });
  }

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log("📨 Tickets de broadcast enviados:", ticketChunk);
    } catch (error) {
      console.error("❌ Erro ao enviar broadcast push:", error);
    }
  }
}

/**
 * Enviar notificação push para um usuário (todas as sessões/dispositivos)
 *
 * @param {string} userId
 * @param {{ title: string; body: string; data?: any }} message
 */
export async function sendPushNotificationToUser(userId, message) {
  const tokens = await getUserTokens(userId);

  if (!tokens.length) {
    console.log(
      `ℹ️ Nenhum push token encontrado para usuário: ${userId}. Notificação não enviada.`
    );
    return;
  }

  const messages = [];

  for (const token of tokens) {
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`⚠️ Token inválido ignorado: ${token}`);
      continue;
    }

    messages.push({
      to: token,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data || {},
    });
  }

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      console.log("📨 Tickets de push enviados:", ticketChunk);
    } catch (error) {
      console.error("❌ Erro ao enviar notificações push:", error);
    }
  }
}

export async function listUserTokens(userId) {
  const tokensDocs = await UserPushToken.find({ userId });

  if (!tokensDocs.length) {
    return [];
  }

  return tokensDocs.map((doc) => ({
    id: doc._id,
    ...doc.toObject(),
  }));
}
