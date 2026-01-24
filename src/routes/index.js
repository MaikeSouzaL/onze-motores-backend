/**
 * Rotas principais da API
 */

import express from "express";
import stripeRoutes from "./stripe.routes.js";
import notificationRoutes from "./notification.routes.js";
import inAppNotificationRoutes from "./notificationRoutes.js";
import authRoutes from "./authRoutes.js";
import motorRoutes from "./motorRoutes.js";
import empresaRoutes from "./empresaRoutes.js";
import subscriptionRoutes from "./subscriptionRoutes.js";
import configRoutes from "./configRoutes.js";
import pdfConfigRoutes from "./pdfConfigRoutes.js";

import paymentReceiptRoutes from "./paymentReceiptRoutes.js";
import pdfRoutes from "./pdfRoutes.js";

import signatureConfigRoutes from "./signatureConfigRoutes.js";

import adminRoutes from "./adminRoutes.js";
import termoRetiradaRoutes from "./termoRetiradaRoutes.js";
import termoNotificationRoutes from "./termoNotificationRoutes.js";
import userRoutes from "./userRoutes.js";

import satelliteRoutes from "./satelliteRoutes.js";
import savedSchemaRoutes from "./savedSchemaRoutes.js";
import funcionarioRoutes from "./funcionarioRoutes.js";
import exportRoutes from "./exportRoutes.js";

// Importar rotas de backup (CommonJS)
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const backupRoutes = require("./backupRoutes.cjs");

const router = express.Router();

// Index da API
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Onze Motores - Backend",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
    },
  });
});

// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API está funcionando",
    timestamp: new Date().toISOString(),
  });
});

// Admin
router.use("/admin", adminRoutes);

// Rotas de Backup (Admin)
router.use("/admin/backup", backupRoutes);

// Configurações Globais
router.use("/config", configRoutes);

// IMPORTANTE: Rotas mais específicas devem vir ANTES das genéricas
router.use("/termos/notifications", termoNotificationRoutes);
router.use("/termos", termoRetiradaRoutes);

// Rotas de Autenticação
router.use("/auth", authRoutes);

// Rotas de Usuário
router.use("/users", userRoutes);

// Rotas de Negócio
router.use("/motors", motorRoutes);
router.use("/empresas", empresaRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/pdf-config", pdfConfigRoutes);
router.use("/signature-config", signatureConfigRoutes);
router.use("/payment-receipts", paymentReceiptRoutes);
router.use("/pdfs", pdfRoutes);

// Rotas Satélites (Signature, Version, Coil, Esquema)
router.use("/satellites", satelliteRoutes);

// Rotas de Schemas Salvos
router.use("/saved-schemas", savedSchemaRoutes);

// Rotas de Funcionários
router.use("/funcionarios", funcionarioRoutes);

// Rotas de Exportação
router.use("/export", exportRoutes);

// Rotas do Stripe
router.use("/stripe", stripeRoutes);

// Rotas de notificações (Push Notifications)
router.use("/notifications", notificationRoutes);

// Rotas de notificações in-app (histórico, leitura, etc)
router.use("/in-app-notifications", inAppNotificationRoutes);

// Log das rotas registradas
console.log("✅ Rotas registradas:");
console.log("  - POST /api/stripe/create-checkout-session");
console.log("  - POST /api/stripe/cancel-subscription");
console.log(
  "  - POST /api/stripe/webhook (registrada diretamente no server.js)",
);
console.log("  - POST /api/notifications/register-token");
console.log("  - POST /api/notifications/send-test");

export default router;
