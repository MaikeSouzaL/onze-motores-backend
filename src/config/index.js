/**
 * Configurações centralizadas do backend
 */

import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

export const config = {
  // Servidor
  port: process.env.PORT || 4882,
  nodeEnv: process.env.NODE_ENV || "development",

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  // CORS
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:19006",
    ],
  },

  // MongoDB
  // Padronizado: usar apenas MONGODB_URI (carregado do arquivo .env)
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/onze-motores",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "dev_secret_key_123",
};

// Validação de configurações obrigatórias
const requiredEnvVars = ["STRIPE_SECRET_KEY", "MONGODB_URI", "JWT_SECRET"];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0 && config.nodeEnv === "production") {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`
  );
}
