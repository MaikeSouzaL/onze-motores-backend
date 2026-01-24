/**
 * Configuração do Firebase Admin SDK
 *
 * Usado APENAS para:
 * 1. Autenticação (verificar tokens JWT)
 * 2. Push Notifications (FCM)
 *
 * NÃO USAR PARA FIRESTORE! O banco de dados principal é o MongoDB.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { getAuth } from "firebase-admin/auth";
import { config } from "./index.js";

let messaging = null;
let auth = null;

export function initializeFirebase() {
  try {
    // Verificar se já foi inicializado
    if (getApps().length > 0) {
      messaging = getMessaging();
      auth = getAuth();
      return { messaging, auth };
    }

    let firebaseConfig;

    // Opção 1: Variável de ambiente com JSON completo (RECOMENDADO para EasyPanel/Docker)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        firebaseConfig = {
          credential: cert(serviceAccount),
        };
        console.log("🔐 Firebase configurado via variável de ambiente (JSON)");
      } catch (parseError) {
        console.error(
          "❌ Erro ao parsear FIREBASE_SERVICE_ACCOUNT:",
          parseError.message
        );
        throw new Error("FIREBASE_SERVICE_ACCOUNT contém JSON inválido");
      }
    }
    // Opção 2: Variáveis de ambiente individuais
    else {
      if (
        !config.firebase.projectId ||
        !config.firebase.privateKey ||
        !config.firebase.clientEmail
      ) {
        console.error("❌ Faltam variáveis Firebase!");
        throw new Error(
          "Firebase não configurado. Configure FIREBASE_SERVICE_ACCOUNT ou variáveis individuais (FIREBASE_PROJECT_ID/FIREBASE_PRIVATE_KEY/FIREBASE_CLIENT_EMAIL)."
        );
      }

      firebaseConfig = {
        projectId: config.firebase.projectId,
        credential: cert({
          projectId: config.firebase.projectId,
          privateKey: config.firebase.privateKey,
          clientEmail: config.firebase.clientEmail,
        }),
      };
      console.log("🔐 Firebase configurado via variáveis de ambiente (individuais)");
    }

    const app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    auth = getAuth(app);

    console.log("✅ Firebase Admin (Auth/Messaging) inicializado com sucesso");
    return { messaging, auth };
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase Admin:", error);
    throw error;
  }
}

export function getMessagingInstance() {
  if (!messaging) {
    initializeFirebase();
  }
  return messaging;
}

export function getAuthInstance() {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
}
