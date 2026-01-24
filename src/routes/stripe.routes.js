/**
 * Rotas relacionadas ao Stripe
 */

import express from "express";
import {
  createCheckoutSession,
  cancelSubscription,
  confirmSession,
} from "../controllers/stripe.controller.js";
import { validateCheckoutRequest } from "../validators/stripe.validator.js";

const router = express.Router();

/**
 * POST /api/stripe/create-checkout-session
 * Cria uma sessão de checkout no Stripe
 */
router.post(
  "/create-checkout-session",
  validateCheckoutRequest,
  createCheckoutSession
);

/**
 * POST /api/stripe/cancel-subscription
 * Cancela uma assinatura no Stripe
 */
router.post("/cancel-subscription", (req, res, next) => {
  console.log("📥 Rota /cancel-subscription recebida:", {
    method: req.method,
    path: req.path,
    body: req.body,
  });
  cancelSubscription(req, res, next);
});

/**
 * POST /api/stripe/confirm-session
 * Confirma sessão de checkout e ativa assinatura (fallback)
 */
router.post("/confirm-session", (req, res, next) => {
  console.log("📥 Rota /confirm-session recebida:", {
    method: req.method,
    path: req.path,
    body: req.body,
  });
  confirmSession(req, res, next);
});

// NOTA: A rota /webhook é tratada diretamente no server.js
// porque precisa do raw body antes do express.json()

export default router;
