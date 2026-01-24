/**
 * Rotas de Notificações Push
 */

import express from "express";
import {
  registerPushToken,
  sendTestNotification,
  listTokens,
} from "../controllers/notification.controller.js";
import { notifyMotorChange } from "../controllers/motorNotification.controller.js";

const router = express.Router();

/**
 * POST /api/notifications/register-token
 * Registrar / atualizar token de push do usuário
 */
router.post("/register-token", registerPushToken);

/**
 * POST /api/notifications/send-test
 * Enviar notificação de teste para um usuário
 */
router.post("/send-test", sendTestNotification);

/**
 * POST /api/notifications/motor-change
 * Enviar notificação de criação/edição de motor
 */
router.post("/motor-change", notifyMotorChange);

/**
 * GET /api/notifications/tokens/:userId
 * Listar tokens cadastrados para um usuário
 */
router.get("/tokens/:userId", listTokens);

export default router;


