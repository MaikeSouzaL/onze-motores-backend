/**
 * Servidor principal da API
 */

import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { config } from "./config/index.js";
import { connectDB } from "./config/database.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./middleware/logger.js";
import { rawBodyMiddleware } from "./controllers/webhook.controller.js";
import { startMotorWatcher } from "./services/motorWatcher.service.js";

// Importar serviço de backup (CommonJS)
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { backupService } = require("./services/backup.service.cjs");

// Importar webhook controller separadamente (precisa do raw body)
import { handleWebhook } from "./controllers/webhook.controller.js";

function buildCorsOriginOption() {
    return true; // Permitir todas as origens para simplificar (ou usar config.cors.allowedOrigins)
}

async function createApp() {
  const app = express();

  // Inicializar Serviços
  try {
    await connectDB(); // MongoDB (Banco de dados principal)
    startMotorWatcher(); // Watcher de mudanças (MongoDB Change Streams)
    
    // Iniciar agendador de backups automáticos
    backupService.startScheduler();
    console.log("✅ Serviço de backup automático iniciado");
  } catch (error) {
    console.error("❌ Erro ao inicializar serviços:", error);
  }

  // Middlewares globais
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // IMPORTANTE: Evitar que express.json altere o body do webhook
  // Mantemos express.json para todas as rotas EXCETO o webhook do Stripe
  app.use((req, res, next) => {
    if (req.originalUrl === "/api/stripe/webhook") {
      return next();
    }
    // Termos podem enviar fotos/signatura em base64 (payload grande)
    return express.json({ limit: "25mb" })(req, res, next);
  });
  app.use(logger);

  // Rota de webhook com raw body aplicado diretamente na rota
  app.post("/api/stripe/webhook", rawBodyMiddleware, handleWebhook);

  // Rotas da API
  app.use("/api", routes);

  // Rota raiz
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "API Onze Motores - Backend",
      version: "1.0.0",
      endpoints: {
        health: "/api/health",
        createCheckout: "/api/stripe/create-checkout-session",
        cancelSubscription: "/api/stripe/cancel-subscription",
        webhook: "/api/stripe/webhook",
      }
    });
  });

  // Middleware de erro (deve ser o último)
  app.use(errorHandler);

  return app;
}


// Para Vercel: criar e exportar o app
let appInstance = null;

async function getApp() {
  if (!appInstance) {
    appInstance = await createApp();
  }
  return appInstance;
}

// Função para iniciar o servidor (compatível com local e produção manual)
function startServer() {
  const PORT = config.port || 3000;

  createApp()
    .then((app) => {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
        console.log(`📡 Ambiente: ${config.nodeEnv}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      });
    })
    .catch((error) => {
      console.error("❌ Falha ao iniciar servidor:", error);
      process.exit(1);
    });
}

// Iniciar servidor automaticamente (produção e desenvolvimento)
// Só NÃO inicia se for importado como módulo (Vercel)
startServer();

// Exportar para Vercel
export default getApp;
