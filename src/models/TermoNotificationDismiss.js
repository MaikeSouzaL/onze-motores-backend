/**
 * TermoNotificationDismiss - rastreia quando o usuário "tomou conhecimento" de uma notificação
 * Para evitar mostrar a mesma notificação repetidamente
 */

import mongoose from "mongoose";

const TermoNotificationDismissSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, index: true },
    termoId: { type: String, required: true },
    
    // Tipo de notificação que foi dispensada
    notificationType: {
      type: String,
      enum: ["vencido", "proximo_vencer"], // vencido ou próximo a vencer (5 dias)
      required: true,
    },
    
    // Data em que foi dispensada
    dismissedAt: { type: Date, default: Date.now },
    
    // Data do prazo do termo (para referência)
    dataRetirada: { type: Date, required: true },
  },
  { timestamps: true }
);

// Índice composto para buscar rapidamente se uma notificação foi dispensada
TermoNotificationDismissSchema.index({ uid: 1, termoId: 1, notificationType: 1 }, { unique: true });

// Índice para limpar notificações antigas (após 30 dias)
TermoNotificationDismissSchema.index({ dismissedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model("TermoNotificationDismiss", TermoNotificationDismissSchema);
